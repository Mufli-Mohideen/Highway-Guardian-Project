const bcrypt = require('bcryptjs');
const { getAdminById } = require('../models/adminModel');
const axios = require('axios');
const dotenv = require('dotenv');
const db = require('../db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');


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

const addTollBooth = async (req, res) => {
  const { locationName } = req.body;

  if (!locationName) {
    return res.status(400).json({ message: 'Location name is required' });
  }

  try {
    const query = 'INSERT INTO tollbooths (location_name, created_at) VALUES (?, NOW())';
    const result = await db.execute(query, [locationName]);

    console.log('New toll booth added with ID:', result.insertId);

    return res.status(201).json({ message: 'Toll booth added successfully', id: result.insertId });
  } catch (error) {
    console.error('Error adding toll booth:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getTollBooths = async (req, res) => {
  try {
    const query = 'SELECT * FROM tollbooths';
    const [rows] = await db.execute(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching toll booths:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getTollOperators = async (req, res) => {
  try {
    const query = 'SELECT * FROM tolloperators';
    const [rows] = await db.execute(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching toll operators:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const generatePassword = (length = 6) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  return password;
};


const addTollOperator = async (req, res) => {
  const { fullName, email, tollBoothId } = req.body;

  if (!fullName || !email || !tollBoothId) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const userId = crypto.randomBytes(2).toString('hex').toUpperCase();
  const defaultPassword = generatePassword();


  const salt = bcrypt.genSaltSync(10);
  const pepper = process.env.PEPPER || '';
  const hashedPassword = bcrypt.hashSync(defaultPassword + pepper, salt);

  const query = 'INSERT INTO tolloperators (full_name, user_id, password_hash, email, toll_booth_id, is_password_updated, status, created_at,salt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)';
  
  try {
    const [result] = await db.execute(query, [
      fullName,
      userId,
      hashedPassword,
      email,
      tollBoothId,
      0,
      'Active',
      salt
    ]);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });
    

    const mailOptions = {
      from: 'support@highwayguardian.com', 
      to: email,                         
      subject: 'Toll Operator Credentials',
      text: `Welcome, ${fullName}!\n\nYour account has been created successfully.\n\nYour User ID: ${userId}\nYour Password: ${defaultPassword}\n\nBest Regards,\nHighwayGuardian Team`,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.status(201).json({ message: 'Toll operator added successfully', id: result.insertId });
  } catch (error) {
    console.error('Error adding toll operator:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


module.exports = {
  loginAdmin,
  addTollBooth,
  getTollBooths,
  addTollOperator,
  getTollOperators
};
