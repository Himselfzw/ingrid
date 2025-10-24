const Analytics = require('../models/Analytics');

// Middleware to track page views and user actions
const analyticsTracker = (req, res, next) => {
  const start = Date.now();

  // Generate or get session ID
  let sessionId = req.session.analyticsSessionId;
  if (!sessionId) {
    sessionId = req.session.analyticsSessionId = generateSessionId();
  }

  // Track page view
  if (req.method === 'GET' && !req.path.startsWith('/admin') && !req.path.startsWith('/api')) {
    Analytics.create({
      event: 'page_view',
      category: 'engagement',
      label: req.path,
      value: 1,
      user: req.session.userId || null,
      sessionId: sessionId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      referrer: req.get('Referrer'),
      metadata: {
        method: req.method,
        query: req.query,
        params: req.params
      }
    }).catch(err => console.error('Analytics tracking error:', err));
  }

  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    Analytics.create({
      event: 'page_response',
      category: 'performance',
      label: req.path,
      value: duration,
      user: req.session.userId || null,
      sessionId: sessionId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      metadata: {
        statusCode: res.statusCode,
        duration: duration,
        method: req.method
      }
    }).catch(err => console.error('Analytics response tracking error:', err));
  });

  next();
};

// Function to generate unique session ID
function generateSessionId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Function to track custom events
const trackEvent = async (event, category = 'engagement', label = '', value = null, userId = null, metadata = {}) => {
  try {
    await Analytics.create({
      event,
      category,
      label,
      value,
      user: userId,
      metadata
    });
  } catch (err) {
    console.error('Event tracking error:', err);
  }
};

module.exports = { analyticsTracker, trackEvent };
