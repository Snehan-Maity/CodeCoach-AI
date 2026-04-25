const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  index: { type: Number, required: true }
});

const documentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileSize: { type: Number },
  totalChunks: { type: Number, default: 0 },
  chunks: [chunkSchema],
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', documentSchema);