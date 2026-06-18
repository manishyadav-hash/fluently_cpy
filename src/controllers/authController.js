const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;

const normalizeMobileNumber = (value) => String(value || '').replace(/\D/g, '');

const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

const getJwtSecret = () => process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'dev-secret-change-me';

const buildAuthToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      mobileNumber: user.mobileNumber
    },
    getJwtSecret(),
    { expiresIn: '30d' }
  );

const sendOtp = async (req, res) => {
  try {
    const mobileNumber = normalizeMobileNumber(req.body.mobileNumber);

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await prisma.otpVerification.create({
      data: {
        mobileNumber,
        otp,
        expiresAt,
        isVerified: false
      }
    });

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        mobileNumber,
        otp,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Send OTP failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const mobileNumber = normalizeMobileNumber(req.body.mobileNumber);
    const otp = String(req.body.otp || '').trim();
    const name = req.body.name ? String(req.body.name).trim() : undefined;

    if (!mobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required'
      });
    }

    const latestOtp = await prisma.otpVerification.findFirst({
      where: {
        mobileNumber,
        otp,
        isVerified: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    await prisma.$transaction([
      prisma.otpVerification.update({
        where: { id: latestOtp.id },
        data: { isVerified: true }
      }),
      prisma.user.upsert({
        where: { mobileNumber },
        update: {
          ...(name ? { name } : {})
        },
        create: {
          mobileNumber,
          ...(name ? { name } : {})
        }
      })
    ]);

    const user = await prisma.user.findUnique({
      where: { mobileNumber }
    });

    const token = buildAuthToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    console.error('Verify OTP failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp
};
