const mongoose = require('mongoose');
const recordSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  collection: { type: String, enum: ['assets', 'threats', 'risks'], required: true, index: true },
  name: String, title: String, category: String, ownerTeam: String, criticality: String,
  kind: String, severity: String, asset: String, status: String, description: String,
  likelihood: Number, impact: Number, score: Number, treatment: String
}, { timestamps: true, strict: true });
recordSchema.index({ owner: 1, collection: 1, updatedAt: -1 });
module.exports = mongoose.model('Record', recordSchema);
