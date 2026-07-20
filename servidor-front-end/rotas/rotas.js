const express = require("express");
const rotas = express.Router();
const path = require("path");
const verificadorToken = require("../auth/verificador_token")
const controlador = require("../controlador/controlador");
const { Usuario, Estufa, Sensor } = require("../models/models");
const redisClient = require("../controlador/cliente-redis");
//pagina css do login
rotas.get("/login.css", async (req, res) => {
    res.sendFile(path.join(__dirname, "../src/login.css"));
});
//pagina javascript do login
rotas.get("/login.js", async (req, res) => {
    res.sendFile(path.join(__dirname, "../src/login.js"));
});
//pagina cadastro
rotas.get("/cadastro", async (req, res) => {
    res.sendFile(path.join(__dirname, "../src/cadastro.html"));
});
//pagina css do cadastro
rotas.get("/cadastro.css", async (req, res) => {
    res.sendFile(path.join(__dirname, "../src/cadastro.css"));
});
//pagina javascript do cadastro
rotas.get("/cadastro.js", async (req, res) => {
    res.sendFile(path.join(__dirname, "../src/cadastro.js"));
});
//pagina login
rotas.get("/login", async (req, res) => {
    res.sendFile(path.join(__dirname, "../src/login.html"));
});
//verifica login
rotas.post("/login", async (req, res) => {
    try {
        const usuario = req.body.usuario;
        const senha = req.body.senha;
        const Login = await controlador.loginUsuario(usuario, senha);
        if (Login) {
            const NovoToken = await controlador.gerarToken(usuario, Login.contato);
            if (usuario != null & usuario != "" & senha != null & senha != "" & Login.cod != null & Login.cod != "" & Login.cod != 0 & NovoToken != null & NovoToken != "") {
                res.cookie('token', NovoToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 3600000
                });
                return res.status(200).json({ msg: "logado com sucesso", auth: true, cod: 1 });
            }
        } else {
            throw new Error("Erro ao logar usuario")
        }

    } catch (err) {
        return res.status(400).json({ msg: "nao foi possivel logar, erro interno", auth: false, cod: 0 });
        console.log("erro no login ", err)
    }
});
//verifica cadastro
rotas.post("/cadastro", async (req, res) => {
    try {
        const usuario = req.body.usuario;
        const senha = req.body.senha;
        const contato = req.body.contato;
        const endereco = req.body.endereco;
        const ip = req.ip;
        const cadastroCliente = await controlador.cadastrarUsuario(usuario, senha, contato, endereco, ip);
        res.status(201).json({ cod: cadastroCliente.cod, msg: "cadastrado com sucesso" });
    } catch (err) {
        res.status(500).json({ cod: 0, msg: "erro ao cadastrar" });
        console.log("erro no cadastro ", err);
    }
});
//pagina web principal
rotas.get("/usuarios", verificadorToken, async (req, res) => {
    try {
        //res.sendFile(path.join(__dirname, "../src/index.html"))
        const usuario = await Usuario.find({})
        // res.json({ msg: req.usuarioLogado.usuario })
        res.status(200).json(usuario);
    } catch (err) {
        console.warn(err);
        res.status(400).json({ msg: "Não é possivel acesar a pagina" })
    }
});
//buscar informações do painel
rotas.post("/dados", verificadorToken, async (req, res) => {
    try {
        const nome = req.usuarioLogado.usuario;
        const dados = await controlador.dadosPainel(nome);
        return res.status(200).json(dados);
    } catch (err) {
        console.warn(err);
        res.status(400).json({ msg: "Erro ao obter dados do painel" })
    }
});
//mudar usuario
rotas.post("/usuario", verificadorToken, async (req, res) => {
    try {
        const nomeUsuario = req.usuarioLogado.usuario;
        const { nome, contato, endereco } = req.body;
        const mudansas = { nome: nome, contato: contato, endereco: endereco };
        Object.keys(mudansas).forEach(key => mudansas[key] === undefined && delete mudansas[key]);
        const mudansa = await controlador.mudarUsuario(nomeUsuario, mudansas);
        if ((nome != null & nome != "" & nome != undefined) || (contato != null & contato != "" & contato != undefined)) {
            const NovoToken = await controlador.gerarToken(mudansa.nome, mudansa.contato);
            res.cookie('token', NovoToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                maxAge: 3600000
            });
            req.usuarioLogado.usuario = mudansa.nome;
            req.usuarioLogado.contato = mudansa.contato;
            console.log(NovoToken)
        }
        return res.status(200).json(mudansa);
    } catch (err) {
        console.warn(err);
        res.status(400).json({ msg: "Não foi possivel alterar as informações do usuario" })
    }
});
//criar estufa
rotas.post("/criar/estufa", verificadorToken, async (req, res) => {
    try {
        const nomeUsuario = req.usuarioLogado.usuario;
        const nomeEstufa = req.body.nomeEstufa;
        const plantasao = req.body.plantasao;
        const localizasao = req.body.localizasao;
        const idUsuario = await Usuario.findOne({ nome: nomeUsuario });
        const estufa = await controlador.criarEstufa(idUsuario._id, nomeEstufa, plantasao, localizasao);
        if (estufa != false & estufa != null & estufa != "") {
            return res.status(201).json(estufa);
        } else {
            throw new Error("Erro ao criar estufa");
        }
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: "Nao foi posivel criar estufa" })
    }
});
//ver todas as estufas
rotas.post("/estufas", verificadorToken, async (req, res) => {
    const estufas = await Estufa.find({});
    return res.status(200).json(estufas);
})
//;
//mudar estufa
rotas.post("/mudar/estufa/:id", verificadorToken, async (req, res) => {
    try {
        const idEstufa = req.params.id;
        const nomeUsuario = req.usuarioLogado.usuario;
        const { nome, localizasao, horario_regar, durasao_regar, tipo_regar, plantasao } = req.body;
        const mudansas = { nome: nome, localizasao: localizasao, horario_regar: horario_regar, durasao_regar: durasao_regar, tipo_regar: tipo_regar, plantasao: plantasao };
        Object.keys(mudansas).forEach(key => mudansas[key] === undefined && delete mudansas[key]);
        const mudansa = await controlador.mudarEstufa(nomeUsuario, idEstufa, mudansas);
        return res.status(200).json(mudansa);
    } catch (err) {
        return res.status(400).json({ msg: "erro ao atualizar estufa" })
    }
});
//criar sensor
rotas.post("/criar/sensor/:idEstufa", verificadorToken, async (req, res) => {
    try {
        const nomeUsuario = req.usuarioLogado.usuario;
        const idEstufa = req.params.idEstufa;
        const nome = req.body.nomeSensor;
        const codigo_serial = req.body.codigo_serial;
        const chave = req.body.chave_secreta;
        const cadastroSensor = await controlador.cadastrarSensor(nomeUsuario, idEstufa, codigo_serial, nome, chave);
        return res.status(200).json(cadastroSensor);
    } catch (err) {
        console.warn("Nao foi possivel criar o sensor");
        return res.status(400).json({ msg: "Não foi possivel criar o sensor" });
    }
});

//mudar sensor
rotas.post("/mudar/sensor/:id", verificadorToken, async (req, res) => {
    try {
        const idSensor = req.params.id;
        const nomeUsuario = req.usuarioLogado.usuario;
        const { codigo_serial, nomeSensor } = req.body;
        const mudansas = { nome: nomeSensor }
        Object.keys(mudansas).forEach(key => mudansas[key] === undefined && delete mudansas[key]);
        const mudansa = await controlador.mudarSensor(idSensor, mudansas, nomeUsuario);
        return res.status(200).json(mudansa);
    } catch (err) {
        console.warn(err);
        return res.status(400).json({ msg: "Não foi possivel mudar o sensor" })
    }
});
//deletar estufa
rotas.delete("/deletar/estufa/:id", verificadorToken, async (req, res) => {
    try {
        const nomeUsuario = req.usuarioLogado.usuario;
        const idEstufa = req.params.id;
        const deletar = await controlador.deletarEstufa(nomeUsuario, idEstufa);
        return res.status(200).json(deletar.msg);
    } catch (err) {
        return res.status(400).json({ msg: "Não foi possivel deletar a estufa" })
    }
});
//deletar sensor
rotas.delete("/deletar/sensor/:id", verificadorToken, async (req, res) => {
    try {
        const nomeUsuario = req.usuarioLogado.usuario;
        const idSensor = req.params.id;
        const deletar = await controlador.deletarSensor(idSensor, nomeUsuario);
        return res.status(200).json(deletar);
    } catch (err) {
        console.warn(err)
        return res.status(400).json({ msg: "Não foi possivel deletar o sensor" })
    }
});
//deslogar
rotas.get("/deslogar", async (req, res) => {
    try {
        res.cookie("token", "");
        res.redirect(301, "/login")
    } catch (err) {
        console.warn(err);
        return res.status(400).json({ msg: "Não foi possivel deslogar" })
    }
});
rotas.post("/sensor/chave", verificadorToken, async (req, res) => {
    try {
        const usuario = req.body.usuario;
        const senha = req.body.senha;
        const chave = req.body.chave;
        const codigo_serial = req.body.codigo_serial;
        const cadastarChave = await controlador.criarChave(usuario, senha, chave, codigo_serial);
        res.status(200).json(cadastarChave);
    } catch (err) {
        console.warn(err);
        return res.status(400).json({ msg: "Não foi possivel cadastrar chave do sensor" })
    }
});
async function resetarStatusSensoresParaInativo() {
    try {
        // 1. Busca todos os sensores cadastrados no banco de dados
        const todosOsSensores = await Sensor.find({});

        // 2. Para cada sensor, grava 'INATIVO' no Redis sem tempo de expiração (ou com tempo longo)
        for (const sensor of todosOsSensores) {

            await redisClient.set(`status:${sensor.codigo_serial}`, "Inativo");
        }

        console.log(`🔄 Servidor reiniciado: Status de ${todosOsSensores.length} sensores definidos como INATIVO.`);
    } catch (error) {
        console.error('Erro ao resetar status dos sensores:', error);
    }
}

// Chame essa função logo após a conexão com o MongoDB e o Redis estarem prontas
resetarStatusSensoresParaInativo();
module.exports = rotas;