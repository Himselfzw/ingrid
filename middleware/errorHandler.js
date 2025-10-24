const Log = require('../models/Log');

// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// Global error handler middleware
const errorHandler = async (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Log to database if it's an operational error
  if (err.isOperational) {
    try {
      await Log.create({
        level: 'error',
        message: `${err.name}: ${err.message}`,
        user: req.session?.userId,
        action: 'error',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          stack: err.stack,
          url: req.originalUrl,
          method: req.method,
          body: req.body,
          params: req.params,
          query: req.query
        }
      });
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = new ValidationError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    // Provide more user-friendly messages for common validation errors
    const userFriendlyErrors = errors.map(errorMsg => {
      if (errorMsg.includes('Path `firstName` is required')) {
        return 'First name is required';
      } else if (errorMsg.includes('Path `lastName` is required')) {
        return 'Last name is required';
      } else if (errorMsg.includes('Path `username` is required')) {
        return 'Username is required';
      } else if (errorMsg.includes('Path `email` is required')) {
        return 'Email address is required';
      } else if (errorMsg.includes('Path `password` is required')) {
        return 'Password is required';
      } else if (errorMsg.includes('is shorter than the minimum allowed length')) {
        return 'Password must be at least 6 characters long';
      } else if (errorMsg.includes('is not a valid email')) {
        return 'Please enter a valid email address';
      } else if (errorMsg.includes('to be unique')) {
        return 'This username or email is already taken';
      } else {
        return errorMsg;
      }
    });
    error = new ValidationError(userFriendlyErrors.join(', '));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ValidationError('File too large');
    } else {
      error = new ValidationError('File upload error');
    }
  }

  // CSRF errors from csurf
  if (err.code === 'EBADCSRFTOKEN' || err.code === 'MISSING_CSRF_TOKEN') {
    // For admin routes, don't treat CSRF errors as validation errors since they're skipped
    if (req.path.startsWith('/admin')) {
      error = new AuthorizationError('Access denied');
    } else {
      error = new ValidationError('Invalid or missing CSRF token');
    }
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

// Async error handler wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  if (global.server) {
    global.server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server due to Uncaught Exception');
  if (global.server) {
    global.server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

module.exports = {
  errorHandler,
  catchAsync,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
};
