require("dotenv").config();
const bcrypt = require("bcrypt");
async function verificarHash(senha, hashBanco) {
    const pepper = process.env.PEPPER_SECRET;
    const verificar = await bcrypt.compare((senha + pepper), hashBanco);
    return verificar;
}
module.exports = verificarHash;