const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Category = require('./models/Category');
const Content = require('./models/Content');
require('dotenv').config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  // Check if users already exist and update if needed
  let adminUser = await User.findOne({ username: 'admin' });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    adminUser = new User({
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      email: 'admin@example.com',
      role: 'admin',
    });
    await adminUser.save();
    console.log('Admin user created');
  } else if (!adminUser.email) {
    adminUser.email = 'admin@example.com';
    adminUser.firstName = adminUser.firstName || 'Admin';
    adminUser.lastName = adminUser.lastName || 'User';
    await adminUser.save();
    console.log('Admin user email and names updated');
  } else {
    console.log('Admin user already exists');
  }

  let superAdminUser = await User.findOne({ username: 'superadmin' });
  if (!superAdminUser) {
    const superAdminPassword = await bcrypt.hash('super123', 10);
    superAdminUser = new User({
      username: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      password: superAdminPassword,
      email: 'superadmin@example.com',
      role: 'superadmin',
    });
    await superAdminUser.save();
    console.log('Super Admin user created');
  } else if (!superAdminUser.email) {
    superAdminUser.email = 'superadmin@example.com';
    superAdminUser.firstName = superAdminUser.firstName || 'Super';
    superAdminUser.lastName = superAdminUser.lastName || 'Admin';
    await superAdminUser.save();
    console.log('Super Admin user email and names updated');
  } else {
    console.log('Super Admin user already exists');
  }

  // Seed categories
  const categories = [
    { name: 'Chemicals', description: 'Chemical products and materials', type: 'product' },
    { name: 'Equipment', description: 'Laboratory and industrial equipment', type: 'product' },
    { name: 'Company News', description: 'Official company announcements and updates', type: 'post' },
    { name: 'Industry Updates', description: 'Latest news and trends in the chemical industry', type: 'post' },
  ];

  for (const catData of categories) {
    const existingCat = await Category.findOne({ name: catData.name });
    if (!existingCat) {
      const category = new Category(catData);
      await category.save();
      console.log(`Category '${catData.name}' created`);
    } else {
      console.log(`Category '${catData.name}' already exists`);
    }
  }

  // Seed initial content
  const existingContent = await Content.findOne();
  if (!existingContent) {
    const content = new Content();
    await content.save();
    console.log('Initial content created');
  } else {
    console.log('Content already exists');
  }

  process.exit();
}

seed();
