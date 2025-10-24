const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  author: { type: String, default: 'Admin' },
  image: { type: String }, // path to image
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', postSchema);
