require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';

let adminPasswordHash = '';

async function initializeAdminPassword() {
  adminPasswordHash = await bcrypt.hash(adminPassword, 12);
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
}

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.'
    }
  })
);

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/pricing', (_req, res) => {
  res.json({
    success: true,
    plans: [
      { name: 'Starter', price: 19, currency: 'USD', features: ['1 site', 'Basic support'] },
      { name: 'Pro', price: 49, currency: 'USD', features: ['Unlimited projects', 'Priority support'] },
      { name: 'Business', price: 99, currency: 'USD', features: ['Custom integrations', 'Dedicated support'] }
    ]
  });
});

app.post('/api/lead', (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and message are required.'
    });
  }

  return res.json({
    success: true,
    message: 'Your message has been received successfully.',
    receivedAt: new Date().toISOString(),
    payload: { name, email }
  });
});

app.post('/api/checkout', (req, res) => {
  const { plan, amount, currency = 'USD', customerEmail } = req.body || {};

  if (!plan || !amount || !customerEmail) {
    return res.status(400).json({
      success: false,
      message: 'Plan, amount, and email are required.'
    });
  }

  return res.json({
    success: true,
    message: 'Checkout started successfully.',
    order: {
      plan,
      amount,
      currency,
      customerEmail,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.'
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const isValidEmail = normalizedEmail === adminEmail;
  const isValidPassword = await bcrypt.compare(String(password), adminPasswordHash);

  if (!isValidEmail || !isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Invalid admin credentials.'
    });
  }

  const token = jwt.sign(
    {
      sub: 'admin',
      email: adminEmail,
      role: 'admin'
    },
    jwtSecret,
    { expiresIn: '12h' }
  );

  return res.json({
    success: true,
    token,
    user: {
      email: adminEmail,
      role: 'admin'
    }
  });
});

app.get('/api/admin/session', authRequired, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    loggedIn: true
  });
});

app.post('/api/admin/withdraw', authRequired, (req, res) => {
  const { amount, wallet, note } = req.body || {};

  if (!amount || !wallet) {
    return res.status(400).json({
      success: false,
      message: 'Amount and wallet address are required.'
    });
  }

  return res.json({
    success: true,
    message: 'Withdrawal request queued successfully.',
    request: {
      amount,
      wallet,
      note: note || '',
      requestedBy: req.user.email,
      createdAt: new Date().toISOString()
    }
  });
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  return res.sendFile(path.join(__dirname, 'index.html'));
});

async function startServer() {
  await initializeAdminPassword();

  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
    console.log(`Admin email: ${adminEmail}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
