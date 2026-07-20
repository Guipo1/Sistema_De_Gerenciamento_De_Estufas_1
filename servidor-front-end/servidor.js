const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const https = require("https");
const path = require("path");
const app = express();
const rotas = require("./rotas/rotas");
const opcoesHttps = {
    key: fs.readFileSync(path.join(__dirname, 'cert/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert/cert.pem'))
};
require("./db/config.js")
app.use(cors({ origin: true, credentials: true }));
app.use(express.json())
app.use(cookieParser());
app.use("/", rotas);
https.createServer(opcoesHttps, app).listen(80, () => {
    console.log(`Servidor HTTPS rodando`);
});
module.exports = rotas;