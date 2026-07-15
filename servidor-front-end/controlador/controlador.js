const criarToken = require("../auth/criarToken.js");
//const verificarToken = require("../auth/verificarToken.js");
const criarHash = require("../auth/criarHash.js");
const verificarHash = require("../auth/verificarHash.js");
require("dotenv").config();
const { Usuario, Estufa, Sensor } = require("../models/models.js");
const redisClient = require("../controlador/cliente-redis.js");
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
    const sensores = []
    for (const estufa of estufas) {
        const sensor = await Sensor.find({ estufaId: estufa._id });
        if (sensor != null & sensor != undefined & sensor != "") {
            sensores.push(sensor)
        }
    }
    const dados = {
        usuario: {
            nome: usuario.nome,
            contato: usuario.contato,
            endereco: usuario.endereco
        },
        estufas: estufas || null,
        sensores: sensores
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
            return { msg: "Estufa deletada com sucesso" };
        } else {
            throw new Error("Erro ao deletar estufa")
        }
    } catch (err) {
        console.warn(err)
        return { msg: "Não foi possivel deletar a estufa" };
    }
}
async function cadastrarSensor(nomeUsuario, idEstufa, codigo_serial, nomeSensor) {
    try {
        if (nomeUsuario != null & nomeUsuario != undefined & nomeUsuario != "" & idEstufa != null & idEstufa != undefined & idEstufa != "" & codigo_serial != null & codigo_serial != undefined & codigo_serial != "") {
            const usuario = await Usuario.findOne({ nome: nomeUsuario }).select("_id");
            const estufa = await Estufa.findById(idEstufa).select("usuarioId");
            if (estufa.usuarioId.toString() === usuario.id) {
                const sensor = await Sensor.create({
                    estufaId: idEstufa,
                    codigo_serial: codigo_serial,
                    nome: nomeSensor
                });
                const sensorRedis = await redisClient.get(`sensor:${codigo_serial}`);
                const data = {
                    chave: JSON.parse(sensorRedis).chave,
                    codigo_serial: JSON.parse(sensorRedis).codigo_serial,
                    id_estufa: idEstufa,
                    id_usuario: usuario.id
                }
                await redisClient.set(`sensor:${codigo_serial}`, JSON.stringify(data));
                console.log(await redisClient.get(`sensor:${codigo_serial}`))
                return sensor;
            } else {
                throw new Error("Não foi posivel criar um novo sensor")
            }
        }
    } catch (err) {
        return err;
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
                    if (sensor.codigo_serial === mudansas.codigo_serial) {
                        const redisSensor = redisClient.get(`sensor:${sensor.codigo_serial}`);
                        await redisClient.set(`sensor:${mudansas.codigo_serial}`, redisSensor);
                        await redisClient.del(`sensor:${sensor.codigo_serial}`);
                    }
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
                console.log(sensor.estufaId.toString(), estufa.id)
                if (sensor.estufaId.toString() === estufa.id) {
                    await redisClient.del(`sensor:${sensor.codigo_serial}`);
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
            const dados = { chave_secreta: chave, codigo_serial: codigo_serial, id_estufa: null, id_usuario: null }
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