const bcrypt = require('bcryptjs');
const { getAdminById } = require('../models/adminModel');
const axios = require('axios');
const dotenv = require('dotenv');
const db = require('../db');
const jwt = require('jsonwebtoken');


dotenv.config();

const verifyRecaptcha = async (recaptchaToken) => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  console.log(secretKey);
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;

  try {
    const response = await axios.post(url);
    return response.data.success;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
};

const loginAdmin = async (req, res) => {


  const { id, password, recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ message: 'reCAPTCHA token is required' });
  }

  console.log('Verifying reCAPTCHA with token:', recaptchaToken);

  const isHuman = await verifyRecaptcha(recaptchaToken);
  if (!isHuman) {
    console.error('reCAPTCHA verification failed');
    return res.status(400).json({ message: 'reCAPTCHA verification failed' });
  }else{
    console.log("Recaptcha verification Successful");
  }

  try {
    console.log('Fetching user with ID:', id);
    const user = await getAdminById(id);

    if (!user) {
      console.error('User not found for ID:', id);
      return res.status(401).json({ message: 'User Not found' });
    }

    const hashedPassword = user.password_hash;
    const pepper = process.env.PEPPER;
    const pepperedPassword = password + pepper;

    console.log('Comparing passwords...');
    const isPasswordCorrect = bcrypt.compareSync(pepperedPassword, hashedPassword);
    if (!isPasswordCorrect) {
      console.error('Incorrect password for user:', id);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const queryUpdate = 'UPDATE admin_users SET last_login = NOW() WHERE id = ?';
    console.log('Updating last login for user:', id);
    await db.execute(queryUpdate, [id]);

    console.log('Login successful for user:', id);
    return res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  loginAdmin,
};
