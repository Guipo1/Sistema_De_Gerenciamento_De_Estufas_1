const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const rotas = require("./rotas/rotas");
require("./db/config.js")
app.use(cors({ origin: true, credentials: true }));
app.use(express.json())
app.use(cookieParser());
app.use("/", rotas)
app.listen(80, () => console.log("Servidor rodando."))
module.exports = rotas;