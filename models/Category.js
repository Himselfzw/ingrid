const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  type: { type: String, enum: ['product', 'post'], required: true }, // to distinguish
});

module.exports = mongoose.model('Category', categorySchema);
