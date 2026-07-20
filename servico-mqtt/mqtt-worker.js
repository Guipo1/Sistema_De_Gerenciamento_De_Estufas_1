const mqtt = require('mqtt');
const jwt = require('jsonwebtoken');
const redisClient = require('./cliente-redis/cliente-redis.js');
const LeituraRepository = require('./models/models.js');
const pool = require("./db/config.js");

//  Chave secreta para assinar o JWT (em produção, use process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET;

console.log(' Iniciando diagnóstico de conexões...');

//  2. Verificação de conexão com o Redis
// Nota: Dependendo da versão do seu pacote redis, pode ser client.ping() ou escutar eventos do client
redisClient.ping()
    .then((resposta) => {
        console.log(` [REDIS] -> Conectado com sucesso! Resposta: ${resposta}`);
    })
    .catch((erro) => {
        console.error(' [REDIS] -> ERRO ao testar conexão:', erro.message);
    });


// Configuração do endereço do Broker Mosquitto
const mqttUrl = process.env.NODE_ENV === 'production'
    ? 'mqtts://broker-mqtt:8883'
    : 'mqtts://localhost:8883';

console.log(' Tentando conectar ao Broker Mosquitto...');
const mqttOptions = {
    clientId: 'api_backend_node_' + Math.random().toString(16).substr(2, 8),
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD,
    keepalive: 60,
    rejectUnauthorized: false,
    reconnectPeriod: 1000
};
const mqttClient = mqtt.connect(mqttUrl, mqttOptions);

//  3. Verificação de conexão com o Mosquitto
mqttClient.on('connect', () => {
    console.log(' [MOSQUITTO] -> Conectado ao Broker MQTT com sucesso!');

    //  Inscreve a API nos dois tópicos solicitados
    mqttClient.subscribe('/sensor/dados', (err) => {
        if (!err) console.log(' Escutando o tópico: /sensor/dados');
    });

    mqttClient.subscribe('/sensor/token', (err) => {
        if (!err) { console.log(' Escutando o tópico: /sensor/token'); }


    });
});

mqttClient.on('error', (erro) => {
    console.error(' [MOSQUITTO] -> Erro na conexão com o Broker:', erro.message);
});
//  1. Verificação de conexão com o PostgreSQL
pool.query('SELECT NOW()')
    .then(() => {
        console.log(' [POSTGRESQL] -> Conectado com sucesso!');
    })
    .catch((erro) => {
        console.error(' [POSTGRESQL] -> ERRO CRÍTICO ao conectar:', erro.message);
    });
// Toda vez que uma mensagem chegar em QUALQUER tópico inscrito, este evento dispara
mqttClient.on('message', async (topic, message) => {
    var codigo_serial = null;
    console.log("recbido algo do broker")
    try {
        const payloadString = message.toString();
        const dadosDoSensor = JSON.parse(payloadString);
        codigo_serial = dadosDoSensor.codigo_serial;

        if (!codigo_serial) {
            return console.warn(` Mensagem recebida no tópico [${topic}] sem código serial.`);
        }

        //  1. Busca os dados de registro do sensor no Redis
        const chaveRedis = `sensor:${codigo_serial}`;
        const dadosRegistroRaw = await redisClient.get(chaveRedis);

        if (!dadosRegistroRaw) {
            console.warn(` REJEITADO: Sensor não cadastrado no Redis [${codigo_serial}]`);
            enviarRespostaStatus(codigo_serial, "REJECTED", "Sensor nao cadastrado.");
            return;
        }

        // Converte a string do Redis de volta para objeto JavaScript
        const sensorRegistro = JSON.parse(dadosRegistroRaw);

        //  FLUXO A: Recebimento de Telemetria (/sensor/dados)
        if (topic === '/sensor/dados') {
            const { temperatura, umidade, token_jwt } = dadosDoSensor;

            // Segurança: Verifica se o sensor enviou o Token JWT que ele deveria ter obtido antes
            try {
                const tokenValido = jwt.verify(token_jwt, JWT_SECRET);
                if (tokenValido.codigo_serial !== codigo_serial) throw new Error("Serial desalinhado");
            } catch (err) {
                console.warn(` REJEITADO: Token JWT inválido ou ausente para o sensor [${codigo_serial}]`);
                enviarRespostaStatus(codigo_serial, "UNAUTHORIZED", "Token JWT invalido ou expirado.");
                return;
            }
            if (sensorRegistro.id_sensor) {
                const novaLeitura = await LeituraRepository.salvar(codigo_serial, temperatura, umidade, sensorRegistro.id_sensor);
                await redisClient.set(`status:${codigo_serial}`, "Ativo", { EX: 60 });
                enviarRespostaStatus(codigo_serial, "APPROVED", "Dados salvos.", novaLeitura.id);
            } else {
                throw new Error("erro ao salvar dados")
            }
        }

        //  FLUXO B: Solicitação de Token Permanente (/sensor/token)
        if (topic === '/sensor/token') {
            const { chave_secreta_dispositivo } = dadosDoSensor;

            // CRUCIAL: A API confere se a chave que o sensor enviou bate com a chave guardada no Redis
            if (!chave_secreta_dispositivo || chave_secreta_dispositivo !== sensorRegistro.chave_secreta) {
                console.warn(` TENTATIVA DE FRAUDE: Chave secreta incorreta para o sensor [${codigo_serial}]`);
                enviarRespostaStatus(codigo_serial, "BAD_CREDENTIALS", "Chave secreta do dispositivo invalida.");
                return;
            }
            if (sensorRegistro.id_sensor) {
                console.log(` CREDENCIAIS VÁLIDAS: Gerando JWT permanente para [${codigo_serial}]`);

                const tokenJsonWeb = jwt.sign(
                    { codigo_serial: codigo_serial },
                    JWT_SECRET,
                    { expiresIn: "5m" }
                );

                mqttClient.publish(`/sensor/${codigo_serial}/status`, JSON.stringify({
                    status: "TOKEN_ISSUED",
                    mensagem: "Autenticado com sucesso.",
                    token: tokenJsonWeb,
                    timestamp: new Date().toISOString()
                }));
                console.log(await redisClient.get(`sensor:${codigo_serial}`))
            } else {

                mqttClient.publish(`/sensor/${codigo_serial}/status`, JSON.stringify({
                    status: "TOKEN_FAILED",
                    mensagem: "Não foi possivel autenticar",
                    timestamp: new Date().toISOString()
                }));
            }
        }

    } catch (erro) {
        console.error(` Erro no processamento:`, erro.message);
        if (codigo_serial) enviarRespostaStatus(codigo_serial, "ERROR", "Erro interno no servidor.");
    }
});

// Função auxiliar para reduzir repetição de código no envio de respostas
function enviarRespostaStatus(serial, status, mensagem, registroId = null) {
    const resposta = { status, mensagem, timestamp: new Date().toISOString() };
    if (registroId) resposta.registro_id = registroId;
    mqttClient.publish(`/sensor/${serial}/status`, JSON.stringify(resposta));
    return;
}

module.exports = mqttClient;