const jwt = require("jsonwebtoken");
require("dotenv").config();
async function criarToken(usuario, contato) {
    try {
        const token = await jwt.sign({ usuario: usuario, contato: contato }, process.env.JWT_SECRET);
        return token;
    } catch (err) {
        console.log("erro ao criar token", err);
    }
}
module.exports = criarToken;