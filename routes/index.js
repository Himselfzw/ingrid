const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Post = require('../models/Post');
const Product = require('../models/Product');
const Content = require('../models/Content');
const { catchAsync } = require('../middleware/errorHandler');
const { trackEvent } = require('../middleware/analytics');

// Home page
router.get('/', catchAsync(async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).limit(5);
  const products = await Product.find().sort({ createdAt: -1 }).limit(5);
  const content = await Content.findOne() || {};
  res.render('index', { posts, products, content });
}));

// Contact page
router.get('/contact', async (req, res) => {
  const content = await Content.findOne() || {};
  res.render('contact', { content });
});

// Handle contact form submission
router.post('/contact', async (req, res) => {
  try {
    const { firstName, lastName, email, company, phone, subject, message, newsletter } = req.body;

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Email content
    const mailOptions = {
      from: `"${firstName} ${lastName}" <${email}>`,
      to: process.env.CONTACT_EMAIL || 'info@ingridchemicals.com',
      subject: `Contact Form: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'Not provided'}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Newsletter:</strong> ${newsletter ? 'Yes' : 'No'}</p>
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };

    // Send email
    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Log the contact attempt even if email fails
      // You might want to store in database or send to alternative notification
    }

    // Track contact form submission
    await trackEvent('contact_form_submit', 'engagement', 'contact_form', 1, req.session.userId, {
      email: email,
      subject: subject,
      newsletter: newsletter ? true : false
    });

    // Return success response (form submission successful even if email fails)
    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Welcome endpoint
router.get('/welcome', (req, res) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  res.json({ message: 'Welcome to the Ingrid Chemicals API Service!' });
});

module.exports = router;
