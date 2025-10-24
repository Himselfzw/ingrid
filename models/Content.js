const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  // Hero Section
  heroTitle: {
    type: String,
    default: 'Ingrid Chemicals Pvt Ltd'
  },
  heroSubtitle: {
    type: String,
    default: 'Leading provider of high-quality mining chemicals and industrial equipment with over 20 years of industry expertise and innovation.'
  },

  // About Section
  aboutTitle: {
    type: String,
    default: 'About Ingrid Chemicals'
  },
  aboutText1: {
    type: String,
    default: 'Founded in 2003, Ingrid Chemicals has established itself as a trusted partner in the mining industry, providing specialized chemical solutions and equipment to enhance operational efficiency and safety.'
  },
  aboutText2: {
    type: String,
    default: 'Our commitment to quality, innovation, and customer satisfaction has made us the preferred choice for mining operations across the region.'
  },

  // Contact Information
  contactAddress: {
    type: String,
    default: '123 Industrial Park, Mining City'
  },
  contactPhone: {
    type: String,
    default: '+1 (555) 123-4567'
  },
  contactEmail: {
    type: String,
    default: 'info@ingridchemicals.com'
  },
  contactHours: {
    type: String,
    default: 'Mon - Fri: 8:00 AM - 6:00 PM<br>Sat: 9:00 AM - 2:00 PM<br>Sun: Closed'
  },

  // Business Hours Widget
  businessHours: {
    days: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      openTime: {
        type: String,
        default: '08:00'
      },
      closeTime: {
        type: String,
        default: '18:00'
      },
      isClosed: {
        type: Boolean,
        default: false
      }
    }],
    holidays: [{
      date: {
        type: Date,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      isClosed: {
        type: Boolean,
        default: true
      },
      customHours: {
        openTime: String,
        closeTime: String
      }
    }]
  },

  // Meta
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one content document exists
contentSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existing = await this.constructor.findOne();
    if (existing) {
      throw new Error('Only one content document can exist');
    }
  }
  next();
});

module.exports = mongoose.model('Content', contentSchema);
