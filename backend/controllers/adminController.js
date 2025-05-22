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

const updateTollBooth = async (req, res) => {
  const { id } = req.params;
  const { location_name } = req.body;

  console.log('Updating toll booth:', { id, location_name });

  // Validate empty location name
  if (!location_name || !location_name.trim()) {
    console.log('Validation failed: Empty location name');
    return res.status(400).json({ 
      message: 'Location name cannot be empty',
      field: 'location_name'
    });
  }

  try {
    // Check if the toll booth exists first
    const [existingBooth] = await db.execute('SELECT id FROM tollbooths WHERE id = ?', [id]);
    
    if (existingBooth.length === 0) {
      console.log('Toll booth not found:', id);
      return res.status(404).json({ message: 'Toll booth not found' });
    }

    // Check if another toll booth with the same name exists (excluding current booth)
    const checkQuery = 'SELECT id FROM tollbooths WHERE location_name = ? AND id != ?';
    const [existing] = await db.execute(checkQuery, [location_name.trim(), id]);

    if (existing.length > 0) {
      console.log('Duplicate location name found');
      return res.status(400).json({ 
        message: 'A toll booth with this location name already exists',
        field: 'location_name'
      });
    }

    // Update the toll booth
    const updateQuery = 'UPDATE tollbooths SET location_name = ? WHERE id = ?';
    const [result] = await db.execute(updateQuery, [location_name.trim(), id]);

    if (result.affectedRows === 0) {
      console.log('Update failed: No rows affected');
      return res.status(404).json({ message: 'Failed to update toll booth' });
    }

    // Fetch the updated toll booth
    const [updated] = await db.execute('SELECT * FROM tollbooths WHERE id = ?', [id]);
    console.log('Update successful:', updated[0]);
    
    res.status(200).json(updated[0]);
  } catch (error) {
    console.error('Database error while updating toll booth:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteTollBooth = async (req, res) => {
  const { id } = req.params;

  console.log('Attempting to delete toll booth:', id);

  try {
    // First check if the toll booth exists
    const [existingBooth] = await db.execute('SELECT id FROM tollbooths WHERE id = ?', [id]);
    
    if (existingBooth.length === 0) {
      console.log('Toll booth not found:', id);
      return res.status(404).json({ message: 'Toll booth not found' });
    }

    // Check if there are any operators assigned to this toll booth
    const [operators] = await db.execute('SELECT id FROM tolloperators WHERE toll_booth_id = ?', [id]);
    
    if (operators.length > 0) {
      console.log('Cannot delete: Toll booth has assigned operators');
      return res.status(400).json({ 
        message: 'Cannot delete toll booth that has operators assigned to it. Please reassign or delete the operators first.'
      });
    }

    // Delete the toll booth
    const [result] = await db.execute('DELETE FROM tollbooths WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      console.log('Delete failed: No rows affected');
      return res.status(404).json({ message: 'Failed to delete toll booth' });
    }

    console.log('Toll booth deleted successfully:', id);
    res.status(200).json({ message: 'Toll booth deleted successfully', id });
  } catch (error) {
    console.error('Database error while deleting toll booth:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateTollOperator = async (req, res) => {
  const { id } = req.params;
  const { full_name, status } = req.body;

  console.log('Updating toll operator:', { id, full_name, status });

  // Input validation
  if (!full_name || !full_name.trim()) {
    console.log('Validation failed: Empty name');
    return res.status(400).json({ 
      message: 'Full name cannot be empty',
      field: 'full_name'
    });
  }

  // Validate status
  const validStatus = ['Active', 'Inactive'];
  if (!validStatus.includes(status)) {
    console.log('Validation failed: Invalid status');
    return res.status(400).json({ 
      message: 'Status must be either Active or Inactive',
      field: 'status'
    });
  }

  try {
    // Check if the toll operator exists and get current data
    const [existingOperator] = await db.execute(
      'SELECT id, full_name, email, status, user_id FROM tolloperators WHERE id = ?', 
      [id]
    );
    
    if (existingOperator.length === 0) {
      console.log('Toll operator not found:', id);
      return res.status(404).json({ message: 'Toll operator not found' });
    }

    const currentOperator = existingOperator[0];

    // Update the toll operator
    const updateQuery = 'UPDATE tolloperators SET full_name = ?, status = ? WHERE id = ?';
    const [result] = await db.execute(updateQuery, [
      full_name.trim(), 
      status, // Keep original case
      id
    ]);

    if (result.affectedRows === 0) {
      console.log('Update failed: No rows affected');
      return res.status(404).json({ message: 'Failed to update toll operator' });
    }

    // Return the updated operator data
    const updatedOperator = {
      ...currentOperator,
      full_name: full_name.trim(),
      status: status
    };

    console.log('Toll operator updated successfully:', updatedOperator);
    res.status(200).json(updatedOperator);
  } catch (error) {
    console.error('Database error while updating toll operator:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteTollOperator = async (req, res) => {
  const { id } = req.params;

  console.log('Attempting to delete toll operator:', id);

  try {
    // First check if the toll operator exists
    const [existingOperator] = await db.execute('SELECT id FROM tolloperators WHERE id = ?', [id]);
    
    if (existingOperator.length === 0) {
      console.log('Toll operator not found:', id);
      return res.status(404).json({ message: 'Toll operator not found' });
    }

    // Delete the toll operator
    const [result] = await db.execute('DELETE FROM tolloperators WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      console.log('Delete failed: No rows affected');
      return res.status(404).json({ message: 'Failed to delete toll operator' });
    }

    console.log('Toll operator deleted successfully:', id);
    res.status(200).json({ message: 'Toll operator deleted successfully', id });
  } catch (error) {
    console.error('Database error while deleting toll operator:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  loginAdmin,
  addTollBooth,
  getTollBooths,
  addTollOperator,
  getTollOperators,
  updateTollBooth,
  deleteTollBooth,
  updateTollOperator,
  deleteTollOperator
};
