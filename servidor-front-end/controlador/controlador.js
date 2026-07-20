const criarToken = require("../auth/criarToken.js");
//const verificarToken = require("../auth/verificarToken.js");
const criarHash = require("../auth/criarHash.js");
const verificarHash = require("../auth/verificarHash.js");
require("dotenv").config();
const { Usuario, Estufa, Sensor } = require("../models/models.js");
const redisClient = require("../controlador/cliente-redis.js");
const pool = require("../db/config.js");
async function cadastrarUsuario(usuario, senha, contato, endereco, ip) {
    try {
        // const cadastro = await fetch('http://api:3000/cadastrar/usuario', { method: "POST", headers: "content" });
        const hashsenha = await criarHash(senha);
        // cadastro.push({ usuario: usuario, hash: hashsenha, contato: contato, endereco: endereco, ip: ip })
        const cadastro = await Usuario.create({
            nome: usuario,
            contato: contato,
            endereco: endereco,
            ip: ip,
            hash: hashsenha
        });
        if (cadastro) {
            return { cod: 1 };
        } else {
            throw new Error("Erro ao cadastrar usuario");
        }
    } catch (err) {
        if (err.code === 11000) {
            console.warn("nome de usuario ja existente");
            return { cod: 2 }
        } else {
            console.log("erro ao cadastrar ", err);
            return { cod: 0 };
        }
    }
}
async function loginUsuario(usuario, senha) {
    try {
        const usuarioBanco = await Usuario.findOne({ nome: usuario })
        const verificarSenha = await verificarHash(senha, usuarioBanco.hash);//falta buscar hash do banco.

        return { cod: verificarSenha, contato: usuarioBanco.contato }
    } catch (err) {
        return false
    }

}
async function gerarToken(usuario) {
    const token = await criarToken(usuario);
    return token;
}
async function dadosPainel(nome) {
    const usuario = await Usuario.findOne({ nome: nome });
    const estufas = await Estufa.find({ usuarioId: usuario._id });
    const sensores = [];
    const dadosSensores = [];
    for (const estufa of estufas) {
        const sensor = await Sensor.find({ estufaId: estufa._id });
        if (sensor != null & sensor != undefined & sensor != "") {
            for (const sensor1 of sensor) {
                const dadosSensor = await redisClient.get(`sensor:${sensor1.codigo_serial}`);
                const dados = JSON.parse(dadosSensor);
                const sensorStatus = await redisClient.get(`status:${sensor1.codigo_serial}`);
                if (sensorStatus != sensor1.status) {
                    sensor1["status"] = sensorStatus ?? "Inativo";
                    await Sensor.findByIdAndUpdate(sensor1.id, { status: sensorStatus ?? "Inativo" }, { new: true })
                }
                sensores.push(sensor1);
                //
                // O $1 será substituído pelo primeiro valor do array [codigoSerial]
                const query = 'SELECT * FROM leitura_sensores WHERE codigo_serial = $1 AND id_sensor = $2';
                const valores = [sensor1.codigo_serial.toString(), sensor1.id.toString()];

                const resultado = await pool.query(query, valores);

                // Se encontrou algum registro, retorna a primeira linha
                if (resultado.rows.length > 0) {
                    for (const dados of resultado.rows) {
                        dadosSensores.push(dados);
                    }
                }
                //
            }

        }
    }

    const dados = {
        usuario: {
            nome: usuario.nome,
            contato: usuario.contato,
            endereco: usuario.endereco
        },
        estufas: estufas || null,
        sensores: sensores || null,
        dados: dadosSensores || null
    }
    return dados;
}
async function mudarUsuario(nome, mudansas) {
    try {
        const usuario = await Usuario.findOne({ nome: nome }).select("_id");
        const idUsuario = usuario.id;
        const mudansa = await Usuario.findByIdAndUpdate(idUsuario, { $set: mudansas }, { new: true });
        return mudansa;
    } catch (err) {
        console.warn(err);
        return err;
    }
}
async function criarEstufa(id, nomeEstufa, plantasao, localizasao) {
    try {
        if ((id != null & id != "") & (nomeEstufa != null & nomeEstufa != "") & (plantasao != null & plantasao != "") & (localizasao != null & localizasao != "")) {
            const estufa = await Estufa.create({
                usuarioId: id,
                nome: nomeEstufa,
                plantasao: plantasao,
                localizasao: localizasao
            });
            return estufa;
        } else {
            throw new Error("Erro ao criar estufa")
        }
    } catch (err) {
        return false
    }
}
async function mudarEstufa(nomeUsuario, idEstufa, mudansas) {
    try {
        const usuarioBanco = await Usuario.findOne({ nome: nomeUsuario }).select("_id");
        const estufa = await Estufa.findById(idEstufa).select("usuarioId");
        if (usuarioBanco.id === estufa.usuarioId.toString()) {
            const mudansa = await Estufa.findByIdAndUpdate(idEstufa, { $set: mudansas }, { new: true });
            if (mudansa) {
                return mudansa;
            } else {
                throw new Error("Erro ao atualizar estufa");
            }
        }
    } catch (err) {
        return err;
    }
}
async function deletarEstufa(nomeUsuario, idEstufa) {
    try {
        const usuario = await Usuario.findOne({ nome: nomeUsuario }).select("_id");
        const estufa = await Estufa.findById(idEstufa).select("usuarioId");
        if (usuario.id === estufa.usuarioId.toString() & usuario != null & usuario != undefined & usuario != "" & estufa != null & estufa != undefined & estufa != "") {
            await Estufa.findByIdAndDelete(idEstufa);
            const sensoresDeletados = await Sensor.find({ estufaId: idEstufa });
            for (const sensor of sensoresDeletados) {
                await redisClient.set(`status:${sensor.codigo_serial}`, "Inativo");
                const dadosSensor = await redisClient.get(`sensor:${sensor.codigo_serial}`);
                const dadosSensorJson = { codigo_serial: dadosSensor.codigo_serial, chave_secreta: dadosSensor.chave_secreta }
                await redisClient.set(`sensor:${sensor.codigo_serial}`, JSON.stringify(dadosSensorJson))
                await Sensor.findByIdAndDelete(sensor.id);
            }
            return { msg: "Estufa deletada com sucesso" };
        } else {
            throw new Error("Erro ao deletar estufa")
        }
    } catch (err) {
        console.warn(err)
        return { msg: "Não foi possivel deletar a estufa" };
    }
}
async function cadastrarSensor(nomeUsuario, idEstufa, codigo_serial, nomeSensor, chave) {
    try {
        if (nomeUsuario != null & nomeUsuario != undefined & nomeUsuario != "" & idEstufa != null & idEstufa != undefined & idEstufa != "" & codigo_serial != null & codigo_serial != undefined & codigo_serial != "") {
            const usuario = await Usuario.findOne({ nome: nomeUsuario }).select("_id");
            const estufa = await Estufa.findById(idEstufa).select("usuarioId");
            if (estufa.usuarioId.toString() === usuario.id) {
                const sensorRedis = await redisClient.get(`sensor:${codigo_serial}`);
                const existe = JSON.parse(sensorRedis);
                const sensorStatus = await redisClient.get(`status:${codigo_serial}`);
                console.log("existe: ", existe, Number(existe.chave_secreta) === Number(chave))
                if (Number(existe.chave_secreta) === Number(chave) & (existe.id_sensor === "" || existe.id_sensor === null || existe.id_sensor === "null" || existe.id_sensor === undefined)) {
                    console.log("executando dentro kkl")
                    const sensor = await Sensor.create({
                        estufaId: idEstufa,
                        codigo_serial: codigo_serial,
                        nome: nomeSensor,
                        status: sensorStatus ? "Ativo" : "Inativo"
                    });

                    const data = {
                        chave_secreta: existe.chave_secreta,
                        codigo_serial: existe.codigo_serial,
                        id_estufa: idEstufa,
                        id_sensor: sensor.id,
                    }
                    await redisClient.set(`sensor:${codigo_serial}`, JSON.stringify(data));
                    return sensor;
                } else {
                    throw new Error("Não foi posivel criar um novo sensor")
                }
            } else {
                throw new Error("Não foi posivel criar um novo sensor")
            }
        }
    } catch (err) {
        console.warn(err)
        return { msg: "não foi possivel cadastar sensor" };
    }
}
async function mudarSensor(idSensor, mudansas, nomeUsuario) {
    try {
        if (idSensor != null & idSensor != undefined & idSensor != "") {
            const usuario = await Usuario.findOne({ nome: nomeUsuario }).select("_id");
            const estufas = await Estufa.find({ usuarioId: usuario.id }).select("_id");
            const sensor = await Sensor.findById(idSensor)
            for (const estufa of estufas) {
                if (estufa.id === sensor.estufaId.toString()) {
                    const mudansa = await Sensor.findByIdAndUpdate(idSensor, { $set: mudansas }, { new: true });
                    return mudansa;
                }
            }

        } else {
            throw new Error("Erro ao mudar o sensor")
        }
    } catch (err) {
        return err;
    }
}
async function deletarSensor(idSensor, nomeUsuario) {
    try {
        if (idSensor != null & idSensor != undefined & idSensor != "" & nomeUsuario != null & nomeUsuario != undefined & nomeUsuario != "") {
            const usuario = await Usuario.findOne({ nome: nomeUsuario }).select("_id");
            const estufas = await Estufa.find({ usuarioId: usuario.id }).select("_id");
            const sensor = await Sensor.findById(idSensor);
            for (const estufa of estufas) {
                console.log(sensor.estufaId.toString() === estufa.id);
                if (sensor.estufaId.toString() === estufa.id) {
                    const sensorRedis = await redisClient.get(`sensor:${sensor.codigo_serial}`);
                    const dados = JSON.parse(sensorRedis);
                    dados.id_estufa = null
                    dados.id_sensor = null
                    await redisClient.set(`sensor:${sensor.codigo_serial}`, JSON.stringify(dados));
                    console.log(await redisClient.get(`sensor:${sensor.codigo_serial}`))
                    await Sensor.findByIdAndDelete(idSensor);
                    return { msg: "Sensor deletado com sucesso" }

                }
            }
        }
    } catch (err) {
        return err;
    }
}
async function criarChave(usuario, senha, chave, codigo_serial) {
    try {
        const UsuarioServidor = process.env.USUARIO_SERVIDOR;
        const SenhaServidor = process.env.SENHA_SERVIDOR;
        if (UsuarioServidor === usuario & SenhaServidor === senha) {
            const dados = { chave_secreta: chave, codigo_serial: codigo_serial }
            await redisClient.set(`sensor:${codigo_serial}`, JSON.stringify(dados));
            return { msg: "Chave cadastrada com sucesso" };
        }
    } catch (err) {
        return err;
    }
}
module.exports = {
    cadastrarUsuario,
    loginUsuario,
    gerarToken,
    dadosPainel,
    criarEstufa,
    mudarEstufa,
    deletarEstufa,
    mudarUsuario,
    cadastrarSensor,
    mudarSensor,
    deletarSensor,
    criarChave
}