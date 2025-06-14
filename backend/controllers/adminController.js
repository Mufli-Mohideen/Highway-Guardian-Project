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
  const { locationName, lon, lat } = req.body;

  if (!locationName || !locationName.trim()) {
    return res.status(400).json({ 
      message: 'Location name is required',
      field: 'locationName'
    });
  }

  if (lon === undefined || lat === undefined) {
    return res.status(400).json({
      message: 'Both longitude and latitude are required',
      field: 'coordinates'
    });
  }

  // Validate coordinates
  if (isNaN(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({
      message: 'Invalid longitude. Must be between -180 and 180',
      field: 'lon'
    });
  }

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({
      message: 'Invalid latitude. Must be between -90 and 90',
      field: 'lat'
    });
  }

  try {
    // Check if a toll booth with the same name already exists
    const [existing] = await db.execute('SELECT id FROM tollbooths WHERE location_name = ?', [locationName.trim()]);

    if (existing.length > 0) {
      console.log('Duplicate toll booth name found:', locationName);
      return res.status(400).json({ 
        message: 'A toll booth with this location name already exists',
        field: 'locationName'
      });
    }

    const query = 'INSERT INTO tollbooths (location_name, lon, lat, created_at) VALUES (?, ?, ?, NOW())';
    const result = await db.execute(query, [locationName.trim(), lon, lat]);

    console.log('New toll booth added with ID:', result.insertId);

    return res.status(201).json({ 
      message: 'Toll booth added successfully', 
      id: result.insertId,
      location_name: locationName.trim(),
      lon,
      lat
    });
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
    const query = `
      SELECT t.*, b.location_name as toll_booth_location, b.lon as toll_booth_lon, b.lat as toll_booth_lat
      FROM tolloperators t
      LEFT JOIN tollbooths b ON t.toll_booth_id = b.id
    `;
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

  try {
    // Check if operator with same email already exists
    const [existingOperator] = await db.execute('SELECT id FROM tolloperators WHERE email = ?', [email.trim()]);

    if (existingOperator.length > 0) {
      console.log('Duplicate email found:', email);
      return res.status(400).json({ 
        message: 'An operator with this email already exists',
        field: 'email'
      });
    }

    // Check if toll booth already has an assigned operator
    const [existingAssignment] = await db.execute(
      'SELECT t.*, o.full_name FROM tolloperators o JOIN tollbooths t ON t.id = o.toll_booth_id WHERE t.id = ? AND o.status = "Active"',
      [tollBoothId]
    );

    if (existingAssignment.length > 0) {
      console.log('Toll booth already has an assigned operator:', tollBoothId);
      return res.status(400).json({
        message: `This toll booth already has an assigned operator (${existingAssignment[0].full_name})`,
        field: 'tollBoothId'
      });
    }

    const userId = crypto.randomBytes(2).toString('hex').toUpperCase();
    const defaultPassword = generatePassword();

    const salt = bcrypt.genSaltSync(10);
    const pepper = process.env.PEPPER || '';
    const hashedPassword = bcrypt.hashSync(defaultPassword + pepper, salt);

    const query = 'INSERT INTO tolloperators (full_name, user_id, password_hash, email, toll_booth_id, is_password_updated, status, created_at, salt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)';
  
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

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

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
      subject: 'Welcome to Highway Guardian - Your Toll Operator Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome to Highway Guardian!</h2>
          
          <p>Dear ${fullName},</p>
          
          <p>Your toll operator account has been created successfully. Here are your login credentials:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> ${defaultPassword}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #3498db; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      font-weight: bold;
                      display: inline-block;">
              Login to Your Account
            </a>
          </div>
          
          <p style="color: #e74c3c; font-weight: bold;">Important Security Notes:</p>
          <ul style="color: #7f8c8d;">
            <li>Please change your password after your first login</li>
            <li>Keep your credentials secure and do not share them with anyone</li>
            <li>Make sure to use a strong password when you change it</li>
          </ul>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #7f8c8d; font-size: 0.8em;">
            This is an automated message. Please do not reply to this email.<br>
            If you need assistance, please contact your administrator.
          </p>
        </div>
      `
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
  const { location_name, lon, lat } = req.body;

  console.log('Updating toll booth:', { id, location_name, lon, lat });

  // Validate empty location name
  if (!location_name || !location_name.trim()) {
    console.log('Validation failed: Empty location name');
    return res.status(400).json({ 
      message: 'Location name cannot be empty',
      field: 'location_name'
    });
  }

  // Validate coordinates
  if (lon === undefined || lat === undefined) {
    return res.status(400).json({
      message: 'Both longitude and latitude are required',
      field: 'coordinates'
    });
  }

  if (isNaN(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({
      message: 'Invalid longitude. Must be between -180 and 180',
      field: 'lon'
    });
  }

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({
      message: 'Invalid latitude. Must be between -90 and 90',
      field: 'lat'
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
    const updateQuery = 'UPDATE tollbooths SET location_name = ?, lon = ?, lat = ? WHERE id = ?';
    const [result] = await db.execute(updateQuery, [location_name.trim(), lon, lat, id]);

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
      status,
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

const addMonthlyTarget = async (req, res) => {
  const { toll_booth_id, month, year, target_amount } = req.body;

  try {
    const query = 'INSERT INTO monthlytargets (toll_booth_id, month, year, target_amount) VALUES (?, ?, ?, ?)';
    await db.execute(query, [toll_booth_id, month, year, target_amount]);
    res.status(201).json({ message: 'Monthly target added successfully' });
  } catch (error) {
    console.error('Error adding monthly target:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getMonthlyTargets = async (req, res) => {
  try {
    const query = `
      SELECT mt.*, tb.location_name 
      FROM monthlytargets mt 
      JOIN tollbooths tb ON mt.toll_booth_id = tb.id
      ORDER BY mt.year DESC, mt.month DESC`;
    const [rows] = await db.execute(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching monthly targets:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateMonthlyTarget = async (req, res) => {
  const { id } = req.params;
  const { target_amount } = req.body;

  try {
    const query = 'UPDATE monthlytargets SET target_amount = ? WHERE id = ?';
    await db.execute(query, [target_amount, id]);
    res.status(200).json({ message: 'Monthly target updated successfully' });
  } catch (error) {
    console.error('Error updating monthly target:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteMonthlyTarget = async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM monthlytargets WHERE id = ?';
    await db.execute(query, [id]);
    res.status(200).json({ message: 'Monthly target deleted successfully' });
  } catch (error) {
    console.error('Error deleting monthly target:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get monthly revenue data
const getMonthlyRevenue = async (req, res) => {
  try {
    const query = `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(profit_amount) as revenue
      FROM daily_profits
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `;

    const [results] = await db.query(query);

    res.json(results.map(row => ({
      month: new Date(row.month).toLocaleString('default', { month: 'long', year: 'numeric' }),
      revenue: parseFloat(row.revenue)
    })));
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    res.status(500).json({ message: 'Error fetching monthly revenue data' });
  }
};

// Get toll booth performance data
const getTollBoothPerformance = async (req, res) => {
  try {
    const query = `
      SELECT 
        tb.location_name,
        COALESCE(SUM(dp.profit_amount), 0) as revenue
      FROM tollbooths tb
      LEFT JOIN daily_profits dp ON tb.id = dp.toll_booth_id
      WHERE dp.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY tb.id, tb.location_name
      ORDER BY revenue DESC
    `;

    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error('Error fetching toll booth performance:', error);
    res.status(500).json({ message: 'Error fetching toll booth performance data' });
  }
};

// Get target achievement data
const getTargetAchievement = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const query = `
      SELECT 
        tb.location_name,
        mt.target_amount as target,
        COALESCE(SUM(dp.profit_amount), 0) as actual
      FROM monthlytargets mt
      JOIN tollbooths tb ON mt.toll_booth_id = tb.id
      LEFT JOIN daily_profits dp ON tb.id = dp.toll_booth_id
        AND MONTH(dp.date) = mt.month
        AND YEAR(dp.date) = mt.year
      WHERE mt.month = ? AND mt.year = ?
      GROUP BY tb.id, tb.location_name, mt.target_amount
    `;

    const [results] = await db.query(query, [currentMonth, currentYear]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching target achievement:', error);
    res.status(500).json({ message: 'Error fetching target achievement data' });
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
  deleteTollOperator,
  addMonthlyTarget,
  getMonthlyTargets,
  updateMonthlyTarget,
  deleteMonthlyTarget,
  getMonthlyRevenue,
  getTollBoothPerformance,
  getTargetAchievement
};
