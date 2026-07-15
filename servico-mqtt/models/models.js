const pool = require('../db/config.js');

const LeituraRepository = {
    /**
     * Define o modelo de inserção de dados na tabela leituras_sensores
     * @param {number|string} estufaId 
     * @param {number} temperatura 
     * @param {number} umidade 
     */
    async salvar(codigo_serial, temperatura, umidade, id_estufa) {
        const queryTexto = `
            INSERT INTO leitura_sensores (codigo_serial, temperatura, umidade, id_estufa, data) 
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *;
        `;
        const valores = [codigo_serial, temperatura, umidade, id_estufa];

        // Executa a query utilizando o pool de conexões modular
        const resultado = await pool.query(queryTexto, valores);
        return resultado.rows[0];
    }
};

module.exports = LeituraRepository;