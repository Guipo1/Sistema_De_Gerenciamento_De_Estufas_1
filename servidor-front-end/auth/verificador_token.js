const jwt = require('jsonwebtoken');
require("dotenv").config()
async function verificarToken(req, res, next) {
    try {
        // Busca o token automaticamente dentro dos cookies da requisição
        const token = req.cookies.token;
        if (token) {
            const dadosDecodificados = jwt.verify(token, process.env.JWT_SECRET);
            req.usuarioLogado = dadosDecodificados; // Guarda os dados do usuário para a próxima rota
            next(); // Autorizado! Vai para a rota protegida
        } else {
            throw new Error("erro, falha no token")
        }
    } catch (erro) {
        console.warn(erro)
        return res.status(403).json({ erro: "Token inválido ou expirado." });
        //return res.redirect(301, '/login')
    }
}

module.exports = verificarToken;