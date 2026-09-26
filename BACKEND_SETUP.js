// ============================================================================
// BACKEND SETUP - ADMIN PASSWORD & AUTHENTICATION
// ============================================================================
// Admin Password: PRINCEjames1277 (HASHED IN PRODUCTION)
// This file shows you how to set up the backend for secure admin authentication
// Language: Node.js with Express
// Database: MongoDB (you can use PostgreSQL, MySQL, etc.)

// ============================================================================
// STEP 1: INSTALL REQUIRED PACKAGES
// ============================================================================

/*
npm install express
npm install mongoose (for MongoDB)
npm install bcryptjs (for password hashing)
npm install jsonwebtoken (for JWT tokens)
npm install dotenv (for environment variables)
npm install stripe
npm install cors
npm install express-raw-body (for webhooks)

In your package.json:
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.0.3",
    "stripe": "^12.0.0",
    "cors": "^2.8.5"
  }
}
*/

// ============================================================================
// STEP 2: CREATE .env FILE (Environment Variables)
// ============================================================================

/*
Create a file named ".env" in your project root:

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prank-studio
# OR for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/prank_studio

# Admin Credentials
ADMIN_EMAIL=admin@prank.studio
ADMIN_PASSWORD=PRINCEjames1277
ADMIN_SECRET_KEY=PRANK_ADMIN_SECRET_2024

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_change_this_123456
JWT_ADMIN_SECRET=admin_super_secret_jwt_key_change_this_654321

# Payment Providers
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_WEBHOOK_SECRET
PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID
PAYPAL_SECRET=YOUR_PAYPAL_SECRET

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
*/

// ============================================================================
// STEP 3: SERVER SETUP (server.js or index.js)
// ============================================================================

/*
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✓ Connected to MongoDB');
}).catch(err => {
  console.error('✗ MongoDB connection error:', err);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));
app.use('/webhook', require('./routes/webhooks'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

// ============================================================================
// STEP 4: CREATE ADMIN SCHEMA (models/Admin.js)
// ============================================================================

/*
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  adminKey: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
*/

// ============================================================================
// STEP 5: ADMIN LOGIN ROUTE (routes/auth.js)
// ============================================================================

/*
const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const router = express.Router();

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password, adminKey } = req.body;

    // Validate inputs
    if (!email || !password || !adminKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email, isActive: true });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Verify admin key (secret)
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ error: 'Invalid admin secret key' });
    }

    // Generate JWT token
    const adminToken = jwt.sign(
      { 
        id: admin._id,
        email: admin.email,
        isAdmin: true
      },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    res.json({
      success: true,
      isAdmin: true,
      adminToken,
      admin: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
*/

// ============================================================================
// STEP 6: INITIALIZE ADMIN ACCOUNT (One-Time Setup)
// ============================================================================

/*
Create a file: scripts/createAdmin.js

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const Admin = require('../models/Admin');

async function createAdminAccount() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('✓ Admin account already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Last Login:', existingAdmin.lastLogin);
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      adminKey: process.env.ADMIN_SECRET_KEY
    });

    await admin.save();
    
    console.log('✓ Admin account created successfully!');
    console.log('Email:', process.env.ADMIN_EMAIL);
    console.log('Password: (hashed and stored securely)');
    console.log('Admin Secret Key:', process.env.ADMIN_SECRET_KEY);
    console.log('');
    console.log('✅ You can now login from the frontend with:');
    console.log('Email: admin@prank.studio');
    console.log('Password: PRINCEjames1277');
    console.log('Admin Secret Key: PRANK_ADMIN_SECRET_2024');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating admin account:', error);
    process.exit(1);
  }
}

createAdminAccount();

// Run this once with: node scripts/createAdmin.js
*/

// ============================================================================
// STEP 7: MIDDLEWARE TO VERIFY ADMIN TOKEN
// ============================================================================

/*
Create: middleware/adminAuth.js

const jwt = require('jsonwebtoken');

function adminAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = adminAuth;
*/

// ============================================================================
// STEP 8: ADMIN DASHBOARD ROUTE (routes/admin.js)
// ============================================================================

/*
const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const Withdrawal = require('../models/Withdrawal');

const router = express.Router();

// Get admin dashboard data
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Only admin can access this
    if (!req.admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get revenue statistics
    const transactions = await Transaction.find({ status: 'completed' });
    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Get user counts
    const activePremiumUsers = await User.countDocuments({ plan: { $in: ['premium', 'pro-annual'] } });
    const freeTrialUsers = await User.countDocuments({ plan: 'free' });

    // Get available balance (total revenue - paid withdrawals)
    const paidWithdrawals = await Withdrawal.find({ status: 'completed' });
    const withdrawnAmount = paidWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const availableBalance = totalRevenue - withdrawnAmount;

    // Get promo codes
    const promoCodes = await PromoCode.find();

    // Get withdrawal history
    const withdrawals = await Withdrawal.find().sort({ requestedAt: -1 });

    res.json({
      totalRevenue,
      activePremiumUsers,
      freeTrialUsers,
      availableBalance,
      transactions,
      promoCodes,
      withdrawals
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
*/

// ============================================================================
// STEP 9: COMPLETE SETUP WALKTHROUGH
// ============================================================================

/*
COMPLETE STEP-BY-STEP SETUP:

1. Create a new Node.js project:
   mkdir prank-studio-backend
   cd prank-studio-backend
   npm init -y

2. Install dependencies:
   npm install express mongoose bcryptjs jsonwebtoken dotenv stripe cors

3. Create folder structure:
   mkdir models
   mkdir routes
   mkdir middleware
   mkdir scripts

4. Create .env file with your credentials:
   ADMIN_EMAIL=admin@prank.studio
   ADMIN_PASSWORD=PRINCEjames1277
   ADMIN_SECRET_KEY=PRANK_ADMIN_SECRET_2024
   MONGODB_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/dbname
   JWT_SECRET=your_jwt_secret_key
   JWT_ADMIN_SECRET=your_admin_jwt_secret
   PORT=5000

5. Create server.js with code from STEP 3

6. Create models/Admin.js with code from STEP 4

7. Create routes/auth.js with code from STEP 5

8. Create middleware/adminAuth.js with code from STEP 7

9. Create routes/admin.js with code from STEP 8

10. Create scripts/createAdmin.js with code from STEP 6

11. Create .gitignore file (ADD THIS!):
    node_modules/
    .env
    .env.local
    .env.*.local
    *.log
    dist/
    
    ⚠️ IMPORTANT: Never commit .env file to Git!

12. Run admin creation script:
    node scripts/createAdmin.js
    
    Output:
    ✓ Admin account created successfully!
    Email: admin@prank.studio
    Password: (hashed and stored securely)
    Admin Secret Key: PRANK_ADMIN_SECRET_2024
    
    ✅ You can now login from the frontend with:
    Email: admin@prank.studio
    Password: PRINCEjames1277
    Admin Secret Key: PRANK_ADMIN_SECRET_2024

13. Start the server:
    node server.js
    
    Output:
    Server running on port 5000
    ✓ Connected to MongoDB

14. Login from frontend:
    - Click "Login" tab
    - Click "Admin" role selector
    - Email: admin@prank.studio
    - Password: PRINCEjames1277
    - Admin Secret Key: PRANK_ADMIN_SECRET_2024
    - Click "Login as Admin"

DONE! You now have secure admin authentication! ✅
*/

// ============================================================================
// YOUR ADMIN CREDENTIALS (SAVE THESE SAFELY!)
// ============================================================================

/*
🔐 ADMIN LOGIN CREDENTIALS:

Email: admin@prank.studio
Password: PRINCEjames1277
Admin Secret Key: PRANK_ADMIN_SECRET_2024

Store these in your .env file:
ADMIN_EMAIL=admin@prank.studio
ADMIN_PASSWORD=PRINCEjames1277
ADMIN_SECRET_KEY=PRANK_ADMIN_SECRET_2024

⚠️ SECURITY REMINDERS:
✓ Store .env file SECURELY (never commit to Git)
✓ Password is hashed with bcryptjs in database
✓ Admin Secret Key should be changed periodically
✓ Use strong JWT secrets
✓ Rotate credentials regularly
✓ Use HTTPS only in production
✓ Enable 2FA if possible
*/

// ============================================================================
// QUICK DEPLOY CHECKLIST
// ============================================================================

/*
Before deploying to production:

SECURITY:
☑ Change admin password (optional, yours is: PRINCEjames1277)
☑ Change ADMIN_SECRET_KEY
☑ Generate strong JWT secrets
☑ Set NODE_ENV=production
☑ Use HTTPS everywhere
☑ Enable CORS properly
☑ Add rate limiting
☑ Implement request validation
☑ Use environment variables for all secrets

DATABASE:
☑ Set up MongoDB/PostgreSQL securely
☑ Enable database backups
☑ Use connection strings from environment
☑ Set up database user with limited permissions
☑ Enable encryption at rest

PAYMENT:
☑ Get Stripe API keys
☑ Set up webhook signatures
☑ Test payment flow thoroughly
☑ Implement webhook verification
☑ Add transaction logging

DEPLOYMENT:
☑ Deploy to Heroku, AWS, DigitalOcean, etc.
☑ Set all environment variables on host
☑ Test admin login on production
☑ Monitor logs for errors
☑ Set up automated backups
☑ Enable monitoring/alerting

TESTING:
☑ Test admin login with PRINCEjames1277
☑ Test payment webhook verification
☑ Test withdrawal requests
☑ Test promo code generation
☑ Verify all admin features work
*/

// ============================================================================
// ENVIRONMENT VARIABLES REFERENCE
// ============================================================================

/*
.env file (COMPLETE TEMPLATE):

# =========================
# DATABASE
# =========================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prank-studio

# =========================
# ADMIN CREDENTIALS
# =========================
ADMIN_EMAIL=admin@prank.studio
ADMIN_PASSWORD=PRINCEjames1277
ADMIN_SECRET_KEY=PRANK_ADMIN_SECRET_2024

# =========================
# JWT SECRETS
# =========================
JWT_SECRET=generate_random_string_here_32_chars
JWT_ADMIN_SECRET=generate_random_string_here_32_chars

# =========================
# PAYMENT PROCESSING
# =========================
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET_HERE
PAYPAL_CLIENT_ID=YOUR_CLIENT_ID
PAYPAL_SECRET=YOUR_SECRET

# =========================
# SERVER CONFIGURATION
# =========================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# =========================
# SECURITY NOTES
# =========================
# DO NOT commit .env to Git
# Add .env to .gitignore
# Use different values for production
# Rotate secrets regularly
# Keep backups of credentials
*/

console.log('✓ Backend Setup Guide with Admin Password Loaded');
console.log('📖 Admin Password Set: PRINCEjames1277');
console.log('📧 Admin Email: admin@prank.studio');
console.log('🔑 Admin Secret Key: PRANK_ADMIN_SECRET_2024');
