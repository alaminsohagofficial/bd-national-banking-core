const mongoose = require('mongoose');

const LCSchema = new mongoose.Schema({
    lcNumber: { type: String, required: true, unique: true },
    vehicleModel: { type: String, required: true },
    color: { type: String, required: true },
    engine: { type: String, required: true },
    lcMargin: { type: String, required: true },
    beneficiary: { type: String, required: true },
    status: { type: String, default: 'Approved & Active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LCApplication', LCSchema);
