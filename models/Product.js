const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  image: { type: String }, // path to image
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', productSchema);
