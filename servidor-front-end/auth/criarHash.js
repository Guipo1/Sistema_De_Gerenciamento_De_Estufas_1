const bcrypt = require('bcrypt');
require("dotenv").config();
async function criarHash(senhaPlana) {
    const pepper = process.env.PEPPER_SECRET;
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash((senhaPlana + pepper), saltRounds);
    return senhaHash;
}
module.exports = criarHash;