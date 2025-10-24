const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Category = require('../models/Category');
const { catchAsync, NotFoundError } = require('../middleware/errorHandler');

// Get all posts
router.get('/', catchAsync(async (req, res) => {
  const posts = await Post.find().populate('category').sort({ createdAt: -1 });
  const categories = await Category.find({ type: 'post' });
  res.render('news', { posts, categories });
}));

// Get post by id
router.get('/:id', catchAsync(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('category');
  if (!post) throw new NotFoundError('Post not found');
  res.render('post-detail', { post });
}));

module.exports = router;
