const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  event: { type: String, required: true }, // e.g., 'page_view', 'contact_form_submit', 'product_view'
  category: { type: String, default: 'engagement' }, // GA event category
  label: { type: String }, // GA event label
  value: { type: Number }, // GA event value
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: String }, // To track user sessions
  ip: { type: String },
  userAgent: { type: String },
  url: { type: String }, // Page URL for page views
  referrer: { type: String }, // Referring URL
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional data
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
analyticsSchema.index({ event: 1, createdAt: -1 });
analyticsSchema.index({ sessionId: 1 });
analyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
