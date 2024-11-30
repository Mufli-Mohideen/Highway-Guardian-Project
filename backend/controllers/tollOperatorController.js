const { getTollOperatorByUserId } = require('../models/tollOperatorModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const db = require('../db');

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

const loginTollOperator = async (req, res) => {
    const { user_id, password, turnstileToken } = req.body;
  
    if (!turnstileToken) {
      return res.status(400).json({ message: 'Turnstile token is required' });
    }
  
    console.log('Verifying Turnstile with token:', turnstileToken);
  
    const isTurnstileValid = await verifyTurnstile(turnstileToken);
    if (!isTurnstileValid) {
      console.error('Turnstile verification failed');
      return res.status(400).json({ message: 'Turnstile verification failed' });
    }
  
    console.log('Turnstile verification successful');
  
    try {
      console.log('Fetching user with User ID:', user_id);
  
      const operator = await getTollOperatorByUserId(user_id);
  
      if (!operator) {
        console.error('User not found for User ID:', user_id);
        return res.status(401).json({ message: 'User not found' });
      }
  
      const { password_hash: hashedPassword } = operator;
      const pepper = process.env.PEPPER || '';
      const pepperedPassword = password + pepper;
  
      console.log('Comparing passwords...');
  
      const isPasswordCorrect = bcrypt.compareSync(pepperedPassword, hashedPassword);
  
      if (!isPasswordCorrect) {
        console.error('Incorrect password for User ID:', user_id);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      console.log('Password matched for User ID:', user_id);
  
      const token = jwt.sign({ id: operator.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      const queryUpdate = 'UPDATE tolloperators SET last_login = NOW() WHERE user_id = ?';
      console.log('Updating last login for User ID:', user_id);
      await db.execute(queryUpdate, [user_id]);
  
      console.log('Login successful for User ID:', user_id);
      return res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
      console.error('Error during login:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
  

module.exports = {
  loginTollOperator,
};
