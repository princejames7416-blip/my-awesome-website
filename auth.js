// ============================================================================
// AUTHENTICATION & ADMIN SYSTEM - Complete Backend-Ready Implementation
// ============================================================================

// Admin Credentials (Store securely in backend - NOT in frontend code)
const ADMIN_CONFIG = {
  email: 'admin@prank.studio',
  // In production, compare password hashes on the server, not in frontend
  // Never store passwords in client-side code
  adminKey: 'PRANK_ADMIN_SECRET_2024', // Change this to a strong secret
};

// Mock Database (In production, use MongoDB, PostgreSQL, etc.)
const mockDatabase = {
  users: [],
  transactions: [],
  promoCodes: [],
  withdrawals: [],
};

// Payment Providers & Webhooks
const PAYMENT_CONFIG = {
  stripe: {
    publicKey: 'pk_test_YOUR_STRIPE_PUBLIC_KEY',
    webhookSecret: 'whsec_test_YOUR_WEBHOOK_SECRET',
    endpoint: 'https://your-domain.com/webhook/stripe'
  },
  paypal: {
    clientId: 'YOUR_PAYPAL_CLIENT_ID',
    webhookId: 'YOUR_PAYPAL_WEBHOOK_ID',
    endpoint: 'https://your-domain.com/webhook/paypal'
  }
};

// ============================================================================
// SESSION & STATE MANAGEMENT
// ============================================================================

const sessionState = {
  currentUser: null,
  isAuthenticated: false,
  isAdmin: false,
  userPlan: 'free', // free, premium, pro-annual
  loginToken: null,
  sessionExpiry: null
};

// ============================================================================
// AUTHENTICATION SYSTEM
// ============================================================================

async function handleUserLogin(email, password) {
  try {
    const response = await fetch('https://your-api.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
        loginType: 'user'
      })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    
    // Store session token (Use HttpOnly cookies for production)
    sessionState.currentUser = data.user;
    sessionState.isAuthenticated = true;
    sessionState.loginToken = data.token;
    sessionState.userPlan = data.plan || 'free';
    sessionState.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    // Save to localStorage (use encrypted storage in production)
    localStorage.setItem('userSession', JSON.stringify({
      token: data.token,
      user: data.user,
      plan: data.plan,
      expiry: sessionState.sessionExpiry
    }));

    showNotification('Login successful! Welcome back.', 'success');
    hideAuthModal();
    loadMainApp();

    return true;
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Login failed. Please check your credentials.', 'error');
    return false;
  }
}

// ============================================================================
// ADMIN LOGIN SYSTEM
// ============================================================================

async function handleAdminLogin(email, password, adminKey) {
  try {
    // In production, NEVER verify admin credentials in frontend
    // Always use a secure backend authentication service
    
    const response = await fetch('https://your-api.com/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
        adminKey: adminKey,
        loginType: 'admin'
      })
    });

    if (!response.ok) {
      throw new Error('Admin authentication failed');
    }

    const data = await response.json();

    // Verify admin response includes proper authorization token
    if (!data.isAdmin || !data.adminToken) {
      throw new Error('Not authorized as admin');
    }

    // Store admin session
    sessionState.currentUser = data.admin;
    sessionState.isAuthenticated = true;
    sessionState.isAdmin = true;
    sessionState.loginToken = data.adminToken;
    sessionState.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000);

    localStorage.setItem('adminSession', JSON.stringify({
      token: data.adminToken,
      admin: data.admin,
      expiry: sessionState.sessionExpiry,
      isAdmin: true
    }));

    showNotification('✅ Admin access granted. Welcome to the control panel.', 'success');
    hideAuthModal();
    loadAdminDashboard();
    showAdminFeatures();

    return true;
  } catch (error) {
    console.error('Admin login error:', error);
    showNotification('❌ Admin authentication failed. Invalid credentials or key.', 'error');
    return false;
  }
}

// ============================================================================
// USER REGISTRATION WITH PAYMENT PROCESSING
// ============================================================================

async function handleUserSignup(name, email, password, plan, promoCode = null) {
  try {
    // Validate inputs
    if (password.length < 8) {
      showNotification('Password must be at least 8 characters.', 'error');
      return false;
    }

    if (plan === 'free') {
      // Free trial signup - no payment needed
      const response = await fetch('https://your-api.com/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          email: email,
          password: password,
          plan: 'free',
          trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        })
      });

      if (!response.ok) throw new Error('Signup failed');
      
      const data = await response.json();
      sessionState.currentUser = data.user;
      sessionState.isAuthenticated = true;
      sessionState.loginToken = data.token;
      sessionState.userPlan = 'free';
      
      showNotification('✅ Welcome! Your 7-day free trial has started.', 'success');
      hideAuthModal();
      loadMainApp();
      return true;
    }

    if (plan === 'premium' || plan === 'pro-annual') {
      // Paid plan - initiate payment
      return await initiatePayment(name, email, password, plan, promoCode);
    }
  } catch (error) {
    console.error('Signup error:', error);
    showNotification('Signup failed. Please try again.', 'error');
    return false;
  }
}

// ============================================================================
// PAYMENT PROCESSING WITH WEBHOOK VERIFICATION
// ============================================================================

async function initiatePayment(name, email, password, plan, promoCode) {
  try {
    const planPrices = {
      'premium': 29999, // $299.99 in cents
      'pro-annual': 19999 // $199.99 in cents
    };

    let amount = planPrices[plan];
    let discountedAmount = amount;
    let discountPercentage = 0;

    // Verify and apply promo code
    if (promoCode) {
      const promoValidation = await verifyPromoCode(promoCode);
      if (promoValidation.valid) {
        discountPercentage = promoValidation.discount;
        discountedAmount = Math.round(amount * (1 - discountPercentage / 100));
      } else {
        showNotification('Invalid promo code.', 'error');
        return false;
      }
    }

    // Create payment session via Stripe
    const response = await fetch('https://your-api.com/api/payments/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        name: name,
        password: password, // Send hashed on backend only
        plan: plan,
        amount: discountedAmount,
        originalAmount: amount,
        discountPercentage: discountPercentage,
        promoCode: promoCode || null
      })
    });

    if (!response.ok) throw new Error('Payment session creation failed');

    const data = await response.json();

    // Redirect to Stripe Checkout
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      throw new Error('No checkout URL received');
    }

    return true;
  } catch (error) {
    console.error('Payment initiation error:', error);
    showNotification('Failed to initiate payment. Please try again.', 'error');
    return false;
  }
}

// ============================================================================
// WEBHOOK VERIFICATION & HANDLING
// ============================================================================

// This runs on your BACKEND - NOT on the frontend
// Backend webhook endpoint example (Node.js/Express):

/*
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// Webhook signature verification
app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // CRITICAL: Verify webhook signature to prevent unauthorized payments
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handlePaymentSuccess(session);
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await handlePaymentFailure(failedPayment);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({received: true});
});

// Process successful payment
async function handlePaymentSuccess(session) {
  const db = require('./database'); // Your database
  
  // Create user account with premium access
  const user = await db.users.create({
    email: session.customer_email,
    name: session.client_reference_id.split('|')[0],
    plan: session.client_reference_id.split('|')[1],
    paymentId: session.payment_intent,
    paidAmount: session.amount_total,
    paidAt: new Date(),
    status: 'active'
  });

  // Log transaction
  await db.transactions.create({
    userId: user.id,
    email: user.email,
    amount: session.amount_total / 100,
    plan: user.plan,
    paymentMethod: 'stripe',
    paymentId: session.payment_intent,
    status: 'completed',
    timestamp: new Date()
  });

  // Send confirmation email to user
  await sendEmail(user.email, 'Payment Confirmed', 
    `Welcome to PrankCall Studio Premium! Your access is now active.`);
}
*/

// Frontend webhook status checker (verify payment processing)
async function checkPaymentStatus(paymentIntentId) {
  try {
    const response = await fetch(`https://your-api.com/api/payments/status/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionState.loginToken}`
      }
    });

    if (!response.ok) throw new Error('Status check failed');

    const data = await response.json();
    return data.status; // 'succeeded', 'processing', 'failed'
  } catch (error) {
    console.error('Payment status error:', error);
    return null;
  }
}

// ============================================================================
// PROMO CODE VERIFICATION
// ============================================================================

async function verifyPromoCode(code) {
  try {
    const response = await fetch(`https://your-api.com/api/promo-codes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code
      })
    });

    if (!response.ok) {
      return { valid: false, discount: 0 };
    }

    const data = await response.json();
    return {
      valid: data.isValid,
      discount: data.discountPercentage
    };
  } catch (error) {
    console.error('Promo code verification error:', error);
    return { valid: false, discount: 0 };
  }
}

// ============================================================================
// ADMIN FEATURES - ONLY ACCESSIBLE WITH ADMIN TOKEN
// ============================================================================

function showAdminFeatures() {
  if (!sessionState.isAdmin) {
    console.warn('⚠️ Unauthorized: Admin access required');
    return;
  }

  // Show admin dashboard
  const adminDashboard = document.getElementById('adminDashboard');
  if (adminDashboard) {
    adminDashboard.style.display = 'flex';
  }

  // Hide withdraw buttons from regular users
  const adminLinks = document.querySelectorAll('.admin-only');
  adminLinks.forEach(link => {
    link.style.display = 'block';
  });

  loadAdminDashboard();
}

async function loadAdminDashboard() {
  if (!sessionState.isAdmin) {
    showNotification('❌ Admin access denied', 'error');
    return;
  }

  try {
    const response = await fetch('https://your-api.com/api/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionState.loginToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to load admin dashboard');

    const data = await response.json();

    // Update dashboard statistics
    document.getElementById('totalRevenue').textContent = `$${(data.totalRevenue / 100).toFixed(2)}`;
    document.getElementById('activePremiumUsers').textContent = data.activePremiumUsers;
    document.getElementById('freeTrialUsers').textContent = data.freeTrialUsers;
    document.getElementById('availableBalance').textContent = `$${(data.availableBalance / 100).toFixed(2)}`;
    document.getElementById('withdrawBalance').textContent = `$${(data.availableBalance / 100).toFixed(2)}`;

    // Load transactions
    loadTransactions(data.transactions);

    // Load promo codes
    loadPromoCodes(data.promoCodes);

    // Load withdrawal history
    loadWithdrawalHistory(data.withdrawals);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    showNotification('Failed to load admin dashboard.', 'error');
  }
}

// ============================================================================
// PROMO CODE GENERATION (ADMIN ONLY)
// ============================================================================

async function generatePromoCodes(count, discountPercentage) {
  if (!sessionState.isAdmin) {
    showNotification('❌ Admin access required', 'error');
    return;
  }

  try {
    const response = await fetch('https://your-api.com/api/admin/promo-codes/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionState.loginToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        count: count,
        discountPercentage: discountPercentage,
        forMinimumSpend: 20000 // $200 minimum spend required
      })
    });

    if (!response.ok) throw new Error('Failed to generate promo codes');

    const data = await response.json();
    showNotification(`✅ Generated ${count} promo codes`, 'success');
    
    // Reload promo codes table
    loadPromoCodes(data.codes);

    return data.codes;
  } catch (error) {
    console.error('Promo code generation error:', error);
    showNotification('Failed to generate promo codes.', 'error');
  }
}

async function loadPromoCodes(codes) {
  const promoBody = document.getElementById('promoBody');
  if (!promoBody) return;

  if (codes.length === 0) {
    promoBody.innerHTML = '<tr><td colspan="5" class="no-data">No promo codes yet</td></tr>';
    return;
  }

  promoBody.innerHTML = codes.map(code => `
    <tr>
      <td><code>${code.code}</code></td>
      <td>${code.discountPercentage}% off</td>
      <td>${code.usedBy || 'Available'}</td>
      <td>${new Date(code.createdAt).toLocaleDateString()}</td>
      <td><span class="status-${code.isActive ? 'active' : 'inactive'}">${code.isActive ? 'Active' : 'Used'}</span></td>
    </tr>
  `).join('');
}

// ============================================================================
// TRANSACTIONS & WITHDRAWAL MANAGEMENT (ADMIN ONLY)
// ============================================================================

async function loadTransactions(transactions) {
  const transactionsBody = document.getElementById('transactionsBody');
  if (!transactionsBody) return;

  if (transactions.length === 0) {
    transactionsBody.innerHTML = '<tr><td colspan="5" class="no-data">No transactions yet</td></tr>';
    return;
  }

  transactionsBody.innerHTML = transactions.map(tx => `
    <tr>
      <td>${tx.email}</td>
      <td>${tx.plan}</td>
      <td>$${(tx.amount / 100).toFixed(2)}</td>
      <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
      <td><span class="status-${tx.status}">${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</span></td>
    </tr>
  `).join('');
}

async function requestWithdrawal(amount, method, details) {
  if (!sessionState.isAdmin) {
    showNotification('❌ Admin access required', 'error');
    return;
  }

  if (amount < 50) {
    showNotification('Minimum withdrawal amount is $50.', 'error');
    return;
  }

  try {
    const response = await fetch('https://your-api.com/api/admin/withdrawals/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionState.loginToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        withdrawalMethod: method,
        details: details // Bank account, PayPal email, etc.
      })
    });

    if (!response.ok) throw new Error('Withdrawal request failed');

    const data = await response.json();
    showNotification(`✅ Withdrawal request submitted for $${amount.toFixed(2)}`, 'success');
    
    // Reload withdrawal history
    loadWithdrawalHistory([data.withdrawal]);

    return data.withdrawal;
  } catch (error) {
    console.error('Withdrawal error:', error);
    showNotification('Failed to request withdrawal.', 'error');
  }
}

async function loadWithdrawalHistory(withdrawals) {
  const withdrawalBody = document.getElementById('withdrawalBody');
  if (!withdrawalBody) return;

  if (withdrawals.length === 0) {
    withdrawalBody.innerHTML = '<tr><td colspan="4" class="no-data">No withdrawals yet</td></tr>';
    return;
  }

  withdrawalBody.innerHTML = withdrawals.map(w => `
    <tr>
      <td>$${(w.amount / 100).toFixed(2)}</td>
      <td>${w.withdrawalMethod}</td>
      <td>${new Date(w.requestedAt).toLocaleDateString()}</td>
      <td><span class="status-${w.status}">${w.status.charAt(0).toUpperCase() + w.status.slice(1)}</span></td>
    </tr>
  `).join('');
}

// ============================================================================
// UI EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Role selector
  const roleSelectors = document.querySelectorAll('.role-selector');
  roleSelectors.forEach(btn => {
    btn.addEventListener('click', (e) => {
      roleSelectors.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const role = e.target.dataset.role;
      const loginForm = document.getElementById('loginForm');
      const adminLoginForm = document.getElementById('adminLoginForm');

      if (role === 'admin') {
        loginForm.style.display = 'none';
        adminLoginForm.style.display = 'block';
      } else {
        loginForm.style.display = 'block';
        adminLoginForm.style.display = 'none';
      }
    });
  });

  // Admin login button
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value;
      const password = document.getElementById('adminPassword').value;
      const adminKey = document.getElementById('adminKey').value;

      if (!email || !password || !adminKey) {
        showNotification('Please fill in all admin fields.', 'error');
        return;
      }

      await handleAdminLogin(email, password, adminKey);
    });
  }

  // User login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      await handleUserLogin(email, password);
    });
  }

  // Promo code generation
  const generatePromoBtn = document.getElementById('generatePromoBtn');
  if (generatePromoBtn) {
    generatePromoBtn.addEventListener('click', async () => {
      const count = parseInt(document.getElementById('promoCount').value);
      const discount = parseInt(document.getElementById('promoDiscount').value);
      await generatePromoCodes(count, discount);
    });
  }

  // Withdrawal request
  const withdrawBtn = document.getElementById('withdrawBtn');
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', async () => {
      const amount = parseFloat(document.getElementById('withdrawAmount').value);
      const method = document.getElementById('withdrawMethod').value;
      const details = document.getElementById('withdrawDetails').value;

      if (!amount || !method || !details) {
        showNotification('Please fill in all withdrawal fields.', 'error');
        return;
      }

      await requestWithdrawal(amount, method, details);
    });
  }

  // Admin tabs
  const adminTabs = document.querySelectorAll('.admin-tab');
  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Hide all tabs
      document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
      });

      // Show selected tab
      document.getElementById(`${tabName}Tab`).classList.add('active');

      // Update active tab button
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 14px 20px;
    border-radius: 10px;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    ${type === 'success' ? 'background: #10b981; color: white;' : ''}
    ${type === 'error' ? 'background: #ef4444; color: white;' : ''}
    ${type === 'info' ? 'background: #3b82f6; color: white;' : ''}
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function hideAuthModal() {
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.classList.remove('active');
  }
}

function loadMainApp() {
  const mainApp = document.getElementById('mainApp');
  if (mainApp) {
    mainApp.style.display = 'flex';
  }
}

function loadAdminDashboard() {
  if (sessionState.isAdmin) {
    // Load admin data
    console.log('✅ Loading admin dashboard...');
  }
}

function switchTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (tab === 'login') {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('signupTab').classList.remove('active');
  } else {
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    document.getElementById('signupTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
  }
}

// ============================================================================
// BACKEND WEBHOOK ENDPOINT SETUP INSTRUCTIONS
// ============================================================================

/*
HOW TO SET UP WEBHOOKS FOR PAYMENT VERIFICATION:

1. STRIPE WEBHOOK SETUP:
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: https://your-domain.com/webhook/stripe
   - Select events: checkout.session.completed, payment_intent.payment_failed
   - Copy webhook signing secret to environment variable: STRIPE_WEBHOOK_SECRET
   - Backend will verify signature using stripe.webhooks.constructEvent()

2. PAYPAL WEBHOOK SETUP:
   - PayPal Developer Dashboard > Apps & Credentials
   - Create webhook endpoint: https://your-domain.com/webhook/paypal
   - Events: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.REFUNDED
   - Backend verifies webhook using PayPal's signature verification

3. BACKEND VERIFICATION CODE:
   ```
   // Stripe Example (Node.js/Express)
   const verifyStripeSignature = (req, signature, body) => {
     try {
       return stripe.webhooks.constructEvent(
         body,
         signature,
         process.env.STRIPE_WEBHOOK_SECRET
       );
     } catch (err) {
       throw new Error('Invalid signature');
     }
   };
   ```

4. PROCESS WEBHOOK:
   - Verify signature
   - Extract payment data
   - Update database
   - Send confirmation emails
   - Log transaction
   - Return 200 OK to webhook sender

5. SECURITY CHECKLIST:
   ✓ Verify webhook signatures
   ✓ Use HTTPS only
   ✓ Store webhook secrets in .env
   ✓ Never trust client-side data
   ✓ Validate amounts on server
   ✓ Use idempotency keys to prevent duplicates
   ✓ Log all transactions
   ✓ Implement database transactions for atomicity
*/

console.log('✓ Authentication & Admin System loaded successfully!');
console.log('📋 HOW TO ACCESS ADMIN FEATURES:');
console.log('1. Click "Login" tab');
console.log('2. Click "Admin" role selector');
console.log('3. Enter admin email: admin@prank.studio');
console.log('4. Enter admin password');
console.log('5. Enter admin secret key: PRANK_ADMIN_SECRET_2024');
console.log('6. Click "Login as Admin"');
console.log('⚠️ NOTE: In production, use backend authentication, not frontend!');
