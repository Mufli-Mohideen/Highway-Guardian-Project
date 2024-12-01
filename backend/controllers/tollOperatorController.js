const { getTollOperatorByUserId, getTollOperatorDetailsById } = require('../models/tollOperatorModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const db = require('../db');
const nodemailer = require('nodemailer');


dotenv.config();

const verifyTurnstile = async (token) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  try {
    const response = await axios.post(
      url,
      new URLSearchParams({ secret: secretKey, response: token }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return response.data.success;
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    return false;
  }
};



const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Or your email provider
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password
      },
    });

    const mailOptions = {
      from: 'support@highwayguardian.com',
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};



const loginTollOperator = async (req, res) => {
  const { user_id, password, turnstileToken } = req.body;

  if (!turnstileToken) {
    return res.status(400).json({ message: 'Turnstile token is required' });
  }

  const isTurnstileValid = await verifyTurnstile(turnstileToken);
  if (!isTurnstileValid) {
    return res.status(400).json({ message: 'Turnstile verification failed' });
  }

  try {
    const operator = await getTollOperatorDetailsById(user_id);

    if (!operator) {
      return res.status(401).json({ message: 'User not found' });
    }

    const { password_hash: hashedPassword, email, full_name } = operator;
    const pepper = process.env.PEPPER || '';
    const pepperedPassword = password + pepper;

    const isPasswordCorrect = bcrypt.compareSync(pepperedPassword, hashedPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: operator.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const queryUpdate = 'UPDATE tolloperators SET last_login = NOW() WHERE user_id = ?';
    await db.execute(queryUpdate, [user_id]);

    const userEmailSubject = 'Login Alert';
    const userEmailText = `Dear ${full_name},\n\nYou have successfully logged in. If this wasn't you, please contact support@highwayguardian.com immediately.\n\nHighway Guardian Team`;
    sendEmail(email, userEmailSubject, userEmailText);

    const adminEmail = 'mufli2mail@gmail.com';
    const adminEmailSubject = `User Login Alert: ${full_name}`;
    const adminEmailText = `Dear Admin,\n\nUser ${full_name} has logged in at ${new Date().toLocaleString()}.\n\nHighway Guardian Team`;
    sendEmail(adminEmail, adminEmailSubject, adminEmailText);

    return res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
  

module.exports = {
  loginTollOperator,
};
