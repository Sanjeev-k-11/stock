const express = require('express');
const router = express.Router();
const { signup, login, getProfile, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getProfile);
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;
