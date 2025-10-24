const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Post = require('../models/Post');
const Category = require('../models/Category');
const Log = require('../models/Log');
const Content = require('../models/Content');
const Analytics = require('../models/Analytics');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { catchAsync, ValidationError, AuthorizationError } = require('../middleware/errorHandler');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
// Limit file types to common images and size to 5MB
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowed.test(ext) && allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

// Middleware to check if logged in
function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  } else {
    res.redirect('/admin/login');
  }
}

// Middleware to check if admin
function requireAdmin(req, res, next) {
  if (req.session.userId) {
    User.findById(req.session.userId).then(user => {
      if (user && (user.role === 'admin' || user.role === 'superadmin')) {
        return next();
      } else {
        res.status(403).send('Access denied. Admin role required.');
      }
    });
  } else {
    res.redirect('/admin/login');
  }
}

// Middleware to check if superadmin
function requireSuperAdmin(req, res, next) {
  if (req.session.userId) {
    User.findById(req.session.userId).then(user => {
      if (user && user.role === 'superadmin') {
        return next();
      } else {
        res.status(403).send('Access denied. Super Admin role required.');
      }
    });
  } else {
    res.redirect('/admin/login');
  }
}

const PDFDocument = require('pdfkit');

// Login page
router.get('/login', (req, res) => {
  res.render('admin-login');
});

// Login post
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    // Log login activity
    await Log.create({
      level: 'info',
      message: `User ${username} logged in`,
      user: user._id,
      action: 'login',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    // Role-based redirect
    if (user.role === 'superadmin') {
      res.redirect('/admin/super');
    } else if (user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/');
    }
  } else {
    // Log failed login attempt
    await Log.create({
      level: 'warn',
      message: `Failed login attempt for username: ${username}`,
      action: 'login_failed',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.render('admin-login', { error: 'Invalid credentials' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (user) {
    // Log logout activity
    await Log.create({
      level: 'info',
      message: `User ${user.username} logged out`,
      user: user._id,
      action: 'logout',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  req.session.destroy();
  res.redirect('/');
});

// Dashboard
router.get('/', requireAuth, async (req, res) => {
  const products = await Product.find();
  const posts = await Post.find();
  const categories = await Category.find();
  const user = await User.findById(req.session.userId);
  // Load site content so the admin content form is pre-filled
  let content = await Content.findOne();
  if (!content) {
    content = {};
  }
  const error = req.session.error;
  const success = req.session.success;
  req.session.error = null;
  req.session.success = null;
  res.render('admin-dashboard', { products, posts, categories, user, content, error, success });
});

// Add product
router.post('/products', requireAuth, upload.single('image'), async (req, res) => {
  const { name, description, price, category } = req.body;
  const image = req.file ? req.file.filename : null;
  await Product.create({ name, description, price, category, image });
  res.redirect('/admin');
});

// Add post
router.post('/posts', requireAuth, upload.single('image'), async (req, res) => {
  const { title, content, category } = req.body;
  const image = req.file ? req.file.filename : null;
  await Post.create({ title, content, category, image });
  res.redirect('/admin');
});

// Add category
router.post('/categories', requireAuth, async (req, res) => {
  const { name, description, type } = req.body;
  await Category.create({ name, description, type });
  res.redirect('/admin');
});

// Delete product
router.post('/products/:id/delete', requireAuth, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

// Delete post
router.post('/posts/:id/delete', requireAuth, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

// Delete category
router.post('/categories/:id/delete', requireAuth, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

// Edit product
router.post('/products/:id/edit', requireAuth, upload.single('image'), async (req, res) => {
  const { name, description, price, category } = req.body;
  const updateData = { name, description, price, category };
  if (req.file) {
    updateData.image = req.file.filename;
  }
  await Product.findByIdAndUpdate(req.params.id, updateData);
  res.redirect('/admin#products');
});

// Edit post
router.post('/posts/:id/edit', requireAuth, upload.single('image'), async (req, res) => {
  const { title, content, category } = req.body;
  const updateData = { title, content, category };
  if (req.file) {
    updateData.image = req.file.filename;
  }
  await Post.findByIdAndUpdate(req.params.id, updateData);
  res.redirect('/admin#posts');
});

// Edit category
router.post('/categories/:id/edit', requireAuth, async (req, res) => {
  const { name, description, type } = req.body;
  const updateData = { name, description, type };
  await Category.findByIdAndUpdate(req.params.id, updateData);
  res.redirect('/admin#categories');
});

// Profile update
router.post('/profile/update', requireAuth, catchAsync(async (req, res) => {
  const { firstName, lastName, username, email, currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.session.userId);

  // Check if changing password
  if (newPassword) {
    if (!currentPassword) {
      throw new ValidationError('Current password is required to change password.');
    }
    if (!await bcrypt.compare(currentPassword, user.password)) {
      throw new ValidationError('Current password is incorrect.');
    }
    if (newPassword !== confirmPassword) {
      throw new ValidationError('New passwords do not match.');
    }
    user.password = await bcrypt.hash(newPassword, 10);
  }

  user.firstName = firstName;
  user.lastName = lastName;
  user.username = username;
  user.email = email;
  await user.save();

  req.session.success = 'Profile updated successfully.';
  res.redirect('/admin#profile');
}));

// Content Management Routes
// Get content data for editing
router.get('/content', requireAuth, async (req, res) => {
  try {
    let content = await Content.findOne();
    if (!content) {
      content = await Content.create({});
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Update content
router.post('/content', requireAuth, catchAsync(async (req, res) => {
  const {
    heroTitle,
    heroSubtitle,
    aboutTitle,
    aboutText1,
    aboutText2,
    contactAddress,
    contactPhone,
    contactEmail,
    contactHours
  } = req.body;

  const user = await User.findById(req.session.userId);

  let content = await Content.findOne();
  if (!content) {
    content = new Content();
  }

  // Update fields
  content.heroTitle = heroTitle;
  content.heroSubtitle = heroSubtitle;
  content.aboutTitle = aboutTitle;
  content.aboutText1 = aboutText1;
  content.aboutText2 = aboutText2;
  content.contactAddress = contactAddress;
  content.contactPhone = contactPhone;
  content.contactEmail = contactEmail;
  content.contactHours = contactHours;
  content.lastUpdated = new Date();
  content.updatedBy = user._id;

  // Handle business hours (always build from known day names)
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const days = dayNames.map(day => {
    const isClosed = req.body[`businessHours.days.${day}.isClosed`] === 'on';
    const openTime = req.body[`businessHours.days.${day}.openTime`] || '08:00';
    const closeTime = req.body[`businessHours.days.${day}.closeTime`] || '18:00';
    return { day, openTime, closeTime, isClosed };
  });
  content.businessHours = content.businessHours || {};
  content.businessHours.days = days;

  // Handle holidays - form fields may be strings or arrays
  const holidays = [];
  let holidayNames = req.body['holidayNames'] || [];
  let holidayDates = req.body['holidayDates'] || [];
  let holidayClosed = req.body['holidayClosed'] || [];
  let holidayOpenTimes = req.body['holidayOpenTimes'] || [];
  let holidayCloseTimes = req.body['holidayCloseTimes'] || [];

  // Normalize to arrays
  if (!Array.isArray(holidayNames)) holidayNames = holidayNames ? [holidayNames] : [];
  if (!Array.isArray(holidayDates)) holidayDates = holidayDates ? [holidayDates] : [];
  if (!Array.isArray(holidayClosed)) holidayClosed = holidayClosed ? [holidayClosed] : [];
  if (!Array.isArray(holidayOpenTimes)) holidayOpenTimes = holidayOpenTimes ? [holidayOpenTimes] : [];
  if (!Array.isArray(holidayCloseTimes)) holidayCloseTimes = holidayCloseTimes ? [holidayCloseTimes] : [];

  holidayNames.forEach((name, index) => {
    const dateVal = holidayDates[index];
    if (name && dateVal) {
      const closedVal = holidayClosed[index];
      const isClosed = closedVal === 'on' || closedVal === 'true' || closedVal === 'on';
      const openT = holidayOpenTimes[index] || '08:00';
      const closeT = holidayCloseTimes[index] || '18:00';
      holidays.push({
        name,
        date: new Date(dateVal),
        isClosed,
        customHours: isClosed ? undefined : { openTime: openT, closeTime: closeT }
      });
    }
  });

  content.businessHours.holidays = holidays;

  await content.save();

  // Log the update
  await Log.create({
    level: 'info',
    message: 'Website content updated',
    user: user._id,
    action: 'content_updated',
    metadata: { contentId: content._id }
  });

  req.session.success = 'Content updated successfully.';
  res.redirect('/admin#content');
}));

// Super Admin Dashboard
router.get('/super', requireAdmin, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  const products = await Product.find();
  const posts = await Post.find();
  const categories = await Category.find();
  const logs = await Log.find().sort({ createdAt: -1 }).limit(10);

  // Get signup stats for chart
  const signupStats = await User.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  // Get file stats
  const uploadDir = 'public/uploads/';
  let files = [];
  if (fs.existsSync(uploadDir)) {
    files = fs.readdirSync(uploadDir).map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      return {
        name: filename,
        size: stats.size,
        modified: stats.mtime
      };
    });
  }

  res.render('super-admin-dashboard', {
    users,
    products,
    posts,
    categories,
    logs,
    signupStats,
    files
  });
});

// User management routes
router.get('/super/users', requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  const query = search ? {
    $or: [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  } : {};

  const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await User.countDocuments(query);

  res.json({ users, total, page, pages: Math.ceil(total / limit) });
});

router.post('/super/users', requireAdmin, async (req, res) => {
  const { firstName, lastName, username, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    firstName,
    lastName,
    username,
    email: email || `${username}@example.com`,
    password: hashedPassword,
    role: role || 'user'
  });

  await Log.create({
    level: 'info',
    message: `User ${username} created`,
    user: req.session.userId,
    action: 'user_created',
    metadata: { createdUserId: user._id }
  });

  res.redirect('/admin/super#users');
});

router.post('/super/users/:id/edit', requireAdmin, async (req, res) => {
  const { firstName, lastName, username, email, role, password } = req.body;
  const currentUser = await User.findById(req.session.userId);

  // Only superadmins can assign superadmin role
  if (role === 'superadmin' && currentUser.role !== 'superadmin') {
    return res.status(403).send('Only superadmins can assign superadmin role.');
  }

  const updateData = { firstName, lastName, username, email, role };

  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  await User.findByIdAndUpdate(req.params.id, updateData);

  await Log.create({
    level: 'info',
    message: `User ${username} updated`,
    user: req.session.userId,
    action: 'user_updated',
    metadata: { updatedUserId: req.params.id }
  });

  res.redirect('/admin/super#users');
});

router.post('/super/users/:id/toggle', requireAdmin, catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.isActive = !user.isActive;
  await user.save();

  await Log.create({
    level: 'info',
    message: `User ${user.username} ${user.isActive ? 'activated' : 'deactivated'}`,
    user: req.session.userId,
    action: 'user_toggled',
    metadata: { toggledUserId: req.params.id, isActive: user.isActive }
  });

  res.redirect('/admin/super#users');
}));

router.post('/super/users/:id/delete', requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  await User.findByIdAndDelete(req.params.id);

  await Log.create({
    level: 'warn',
    message: `User ${user.username} deleted`,
    user: req.session.userId,
    action: 'user_deleted',
    metadata: { deletedUserId: req.params.id }
  });

  res.redirect('/admin/super#users');
});

// Storage management routes
router.post('/super/storage/:filename/delete', requireAdmin, async (req, res) => {
  const filePath = path.join('public/uploads/', req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);

    await Log.create({
      level: 'warn',
      message: `File ${req.params.filename} deleted`,
      user: req.session.userId,
      action: 'file_deleted',
      metadata: { filename: req.params.filename }
    });
  }
  res.redirect('/admin/super#storage');
});

// Logs management routes
router.get('/super/logs', requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const level = req.query.level;
  const search = req.query.search || '';

  let query = {};
  if (level && level !== 'all') {
    query.level = level;
  }
  if (search) {
    query.message = { $regex: search, $options: 'i' };
  }

  const logs = await Log.find(query)
    .populate('user', 'username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Log.countDocuments(query);

  res.json({ logs, total, page, pages: Math.ceil(total / limit) });
});

// PDF Reports
router.get('/super/reports/:type', requireSuperAdmin, async (req, res) => {
  const { type } = req.params;
  let data = [];
  let title = '';

  if (type === 'users') {
    data = await User.find().select('username email role createdAt lastLogin isActive');
    title = 'User Report';
  } else if (type === 'logs') {
    data = await Log.find().populate('user', 'username').limit(100).sort({ createdAt: -1 });
    title = 'System Logs Report';
  } else if (type === 'products') {
    data = await Product.find().populate('category', 'name');
    title = 'Products Report';
  } else {
    return res.status(400).send('Invalid report type. Available: users, logs, products');
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(24).fillColor('#001F3F').text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).fillColor('#333').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1.5);

  // Data table-like
  if (type === 'users') {
    doc.fontSize(10).text('Username | Email | Role | Created | Last Login | Active', { continued: true });
    doc.text('');
    data.forEach(user => {
      doc.text(`${user.username} | ${user.email} | ${user.role} | ${user.createdAt.toLocaleDateString()} | ${user.lastLogin ? user.lastLogin.toLocaleDateString() : 'N/A'} | ${user.isActive ? 'Yes' : 'No'}`);
    });
  } else if (type === 'logs') {
    doc.fontSize(10).text('Timestamp | Level | Message | User', { continued: true });
    doc.text('');
    data.forEach(log => {
      doc.text(`${log.createdAt.toLocaleString()} | ${log.level} | ${log.message.substring(0, 100)}... | ${log.user ? log.user.username : 'N/A'}`);
    });
  } else if (type === 'products') {
    doc.fontSize(10).text('Name | Description | Price | Category', { continued: true });
    doc.text('');
    data.forEach(product => {
      doc.text(`${product.name} | ${product.description.substring(0, 50)}... | $${product.price} | ${product.category ? product.category.name : 'N/A'}`);
    });
  }

  doc.end();
});

// Analytics endpoint
router.get('/super/analytics', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Contact form submissions
    const contactSubmissions = await Analytics.countDocuments({
      event: 'contact_form_submit',
      createdAt: { $gte: last30Days }
    });

    // Product views
    const productViews = await Analytics.countDocuments({
      event: 'view_product',
      createdAt: { $gte: last30Days }
    });

    // Page views
    const pageViews = await Analytics.countDocuments({
      event: 'page_view',
      createdAt: { $gte: last30Days }
    });

    // Average session duration (simplified - using response times as proxy)
    const sessionData = await Analytics.aggregate([
      {
        $match: {
          event: 'page_response',
          createdAt: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: '$sessionId',
          avgDuration: { $avg: '$value' },
          pageCount: { $sum: 1 }
        }
      },
      {
        $match: {
          pageCount: { $gte: 2 } // Only sessions with multiple pages
        }
      }
    ]);

    const avgSessionDuration = sessionData.length > 0
      ? Math.round(sessionData.reduce((sum, s) => sum + s.avgDuration, 0) / sessionData.length / 1000) // Convert to seconds
      : 0;

    // Top pages
    const topPages = await Analytics.aggregate([
      {
        $match: {
          event: 'page_view',
          createdAt: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: '$url',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // User paths (simplified - recent sessions)
    const userPaths = await Analytics.aggregate([
      {
        $match: {
          event: 'page_view',
          createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      },
      {
        $sort: { sessionId: 1, createdAt: 1 }
      },
      {
        $group: {
          _id: '$sessionId',
          pages: { $push: '$url' },
          timestamps: { $push: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gte: 2 } // Only multi-page sessions
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({
      contactSubmissions,
      productViews,
      pageViews,
      avgSession: avgSessionDuration,
      topPages: topPages || [],
      userPaths: userPaths || []
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

module.exports = router;
