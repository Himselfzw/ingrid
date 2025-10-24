const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const { catchAsync, NotFoundError } = require('../middleware/errorHandler');
const { trackEvent } = require('../middleware/analytics');

// Get all products
router.get('/', catchAsync(async (req, res) => {
  const products = await Product.find().populate('category');
  const categories = await Category.find({ type: 'product' });
  res.render('products', { products, categories });
}));

// Get product by id
router.get('/:id', catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category');
  if (!product) throw new NotFoundError('Product not found');

  // Track product view
  await trackEvent('view_product', 'engagement', product.name, 1, req.session.userId, {
    productId: product._id,
    category: product.category ? product.category.name : null
  });

  res.render('product-detail', { product });
}));

module.exports = router;
