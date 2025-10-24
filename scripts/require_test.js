// Quick require test to detect syntax errors without starting the server.
// It stubs mongoose.connect to prevent network calls and overrides app.listen to avoid opening ports.

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/ingrid_test';
process.env.SESSION_SECRET = 'testsecret';
process.env.NODE_ENV = 'development';

// Stub mongoose.connect
const mongoose = require('mongoose');
mongoose.connect = async () => ({ connected: true });

// Stub app.listen to prevent actual server start
const originalListen = require('http').Server.prototype.listen;
require('http').Server.prototype.listen = function() { return this; };

try {
  require('../app');
  console.log('Require test passed: app.js loaded without syntax errors');
} catch (err) {
  console.error('Require test failed:', err);
  process.exit(1);
} finally {
  // Restore original listen just in case
  require('http').Server.prototype.listen = originalListen;
}
