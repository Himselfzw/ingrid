const Log = require('../models/Log');

// Logging middleware to log user actions and requests
const logger = async (req, res, next) => {
  const start = Date.now();

  // Log the request
  const logData = {
    level: 'info',
    message: `${req.method} ${req.originalUrl}`,
    user: req.session?.userId || null,
    action: req.method.toLowerCase(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    metadata: {
      url: req.originalUrl,
      method: req.method,
      body: req.method !== 'GET' ? req.body : undefined,
      params: req.params,
      query: req.query
    }
  };

  try {
    await Log.create(logData);
  } catch (err) {
    console.error('Failed to log request:', err);
  }

  // Log response time
  res.on('finish', async () => {
    const duration = Date.now() - start;
    try {
      await Log.create({
        level: 'info',
        message: `Response: ${res.statusCode} in ${duration}ms`,
        user: req.session?.userId || null,
        action: 'response',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        metadata: {
          statusCode: res.statusCode,
          duration: duration,
          url: req.originalUrl
        }
      });
    } catch (err) {
      console.error('Failed to log response:', err);
    }
  });

  next();
};

module.exports = logger;
