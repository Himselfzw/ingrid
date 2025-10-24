const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

const helmet = require('helmet');
const csrf = require('csurf');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.google.com"],
    },
  },
}));

// CSRF protection (after cookie/session middleware if you use cookies)
// csurf requires either session middleware or cookie-parser; we have sessions configured below

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// Initialize CSRF protection and expose token for all views
const csrfProtection = csrf({ ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] });
// Apply CSRF protection to all requests (csurf will only check on state-changing methods)
// Skip CSRF for API endpoints that expect JSON and authenticated admin routes
app.use((req, res, next) => {
  if (req.path === '/welcome' || req.path.startsWith('/admin')) {
    return next();
  }
  csrfProtection(req, res, next);
});
app.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken();
  } catch (e) {
    // If csrf token generation fails, set empty token; the error will be handled on POST
    res.locals.csrfToken = '';
  }
  next();
});

// Logger middleware
const logger = require('./middleware/logger');
app.use(logger);

// Analytics middleware
const { analyticsTracker } = require('./middleware/analytics');
app.use(analyticsTracker);

// Middleware to attach user to res.locals
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const User = require('./models/User');
      const user = await User.findById(req.session.userId);
      res.locals.user = user;
    } catch (err) {
      console.log('Error fetching user:', err);
    }
  }
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/products', require('./routes/products'));
app.use('/news', require('./routes/news'));
app.use('/admin', require('./routes/admin'));

// 404 handler - must be after all routes but before error handling
app.use((req, res, next) => {
  res.status(404).render('404');
});

// Error handling middleware (must be last)
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Make server available globally for error handler
global.server = server;
