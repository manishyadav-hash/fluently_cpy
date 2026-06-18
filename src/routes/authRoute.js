const express = require('express');
const { sendOtp, verifyOtp } = require('../controllers/authController');

const router = express.Router();

router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);

module.exports = router;
