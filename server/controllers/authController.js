const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, isUsingFallback, memoryStore } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_super_secret_jwt_key_2026_sebi_compliant_secure_token';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'stocksense_refresh_token_ultra_secure_secret_key_2026';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, name: user.name };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

// Signup Controller
async function signup(req, res) {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const salt = await bcrypt.genSalt(8);
    const passwordHash = await bcrypt.hash(password, salt);

    if (isUsingFallback()) {
      const existing = memoryStore.users.find(u => u.email === normalizedEmail);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
      }

      const newUser = {
        id: memoryStore.nextUserId++,
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        created_at: new Date()
      };
      memoryStore.users.push(newUser);

      const tokens = generateTokens(newUser);
      return res.status(201).json({
        success: true,
        message: 'Registration successful!',
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
        tokens
      });
    }

    // PostgreSQL / Database Insert
    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
    }

    const [rows, header] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash]
    );

    const newId = (rows && rows[0] && rows[0].id) ? rows[0].id : (header?.insertId || rows?.insertId || Date.now());
    const user = { id: newId, name: name.trim(), email: normalizedEmail };
    const tokens = generateTokens(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user,
      tokens
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
}

// Login Controller
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = null;
    if (isUsingFallback()) {
      user = memoryStore.users.find(u => u.email === normalizedEmail);
    } else {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
      if (rows.length > 0) user = rows[0];
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const tokens = generateTokens(user);

    return res.json({
      success: true,
      message: 'Login successful!',
      user: { id: user.id, name: user.name, email: user.email },
      tokens
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

// Get Logged In User Profile
async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    let user = null;

    if (isUsingFallback()) {
      user = memoryStore.users.find(u => u.id === userId);
    } else {
      const pool = getPool();
      const [rows] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
      if (rows.length > 0) user = rows[0];
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at }
    });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
}

// Change Password
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    let user = null;
    if (isUsingFallback()) {
      user = memoryStore.users.find(u => u.id === userId);
    } else {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (rows.length > 0) user = rows[0];
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    if (isUsingFallback()) {
      user.password_hash = newHash;
    } else {
      const pool = getPool();
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    }

    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
}

module.exports = {
  signup,
  login,
  getProfile,
  changePassword
};
