const mongoose = require('mongoose');

// 1. Modelo de Usuário
const usuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true, unique: true, trim: true },
    contato: { type: String, required: true },
    endereco: { type: String, required: true },
    ip: { type: String, required: true },
    hash: { type: String, required: true },
    dataCadastro: { type: Date, default: Date.now, required: true }
});
const estufaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    localizasao: { type: String, required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    horario_regar: { type: Number, required: true, default: -1 },
    durasao_regar: { type: Number, required: true, default: -1 },
    tipo_regar: { type: String, required: true, default: "Manual" },
    plantasao: { type: String, trim: true },
    dataCriasao: { type: Date, default: Date.now, required: true }
});
const sensorSchema = new mongoose.Schema({
    nome: { type: String },
    estufaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Estufa', required: true },
    codigo_serial: { type: String, required: true },
    dataCriasao: { type: Date, default: Date.now, required: true },
    ip: { type: String },
});
// Exportando os modelos para usar em outras partes do sistema
const Usuario = mongoose.model('Usuario', usuarioSchema);
const Estufa = mongoose.model('Estufa', estufaSchema);
const Sensor = mongoose.model('Sensor', sensorSchema);
module.exports = { Usuario, Estufa, Sensor }