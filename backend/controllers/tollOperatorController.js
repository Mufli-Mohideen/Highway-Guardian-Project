const { getTollOperatorByUserId, getTollOperatorDetailsById } = require('../models/tollOperatorModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const db = require('../db');
const nodemailer = require('nodemailer');


dotenv.config();

const verifyTurnstile = async (turnstileToken) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const url = `https://challenges.cloudflare.com/turnstile/v0/siteverify`;

  try {
    const response = await axios.post(url, {
      secret: secretKey,
      response: turnstileToken,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data.success;
  } catch (error) {
    console.error('Error verifying Turnstile:', error);
    return false;
  }
};



const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: 'support@highwayguardian.com',
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
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
    console.log('Attempting login for user_id:', user_id);
    const operator = await getTollOperatorDetailsById(user_id);

    if (!operator) {
      console.log('No operator found for user_id:', user_id);
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is inactive
    if (operator.status === 'Inactive') {
      console.log('Inactive user attempted login:', user_id);
      return res.status(403).json({ 
        message: 'Your account is currently inactive. Please contact the administrator for assistance.',
        isInactive: true
      });
    }

    const { password_hash: hashedPassword, email, full_name, salt, is_password_updated } = operator;
    console.log('Operator details:', {
      email,
      full_name,
      is_password_updated,
      hasPasswordHash: !!hashedPassword,
      hasSalt: !!salt
    });

    const pepper = process.env.PEPPER || '';
    const pepperedPassword = password + pepper;

    const isPasswordCorrect = bcrypt.compareSync(pepperedPassword, hashedPassword);
    if (!isPasswordCorrect) {
      console.log('Invalid password for user_id:', user_id);
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

    console.log('Login successful, sending response:', {
      isFirstLogin: is_password_updated === 0,
      userId: user_id
    });

    return res.status(200).json({ 
      message: 'Login successful', 
      token,
      isFirstLogin: is_password_updated === 0,
      userId: user_id,
      salt
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
  

const updateFirstTimeLogin = async (req, res) => {
  const { userId, newPassword, phoneNumber } = req.body;

  if (!userId || !newPassword || !phoneNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Get the operator's current data
    const operator = await getTollOperatorDetailsById(userId);
    if (!operator) {
      return res.status(404).json({ message: 'Operator not found' });
    }

    // Hash the new password
    const pepper = process.env.PEPPER || '';
    const pepperedPassword = newPassword + pepper;
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(pepperedPassword, salt);

    // Update the operator's data
    const updateQuery = `
      UPDATE tolloperators 
      SET password_hash = ?, 
          salt = ?, 
          phone_number = ?, 
          is_password_updated = 1 
      WHERE user_id = ?
    `;

    await db.execute(updateQuery, [hashedPassword, salt, phoneNumber, userId]);

    return res.status(200).json({ message: 'Password and phone number updated successfully' });
  } catch (error) {
    console.error('Error updating first-time login data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getTollOperatorDetails = async (req, res) => {
  const { userId } = req.params;

  try {
    const operatorDetails = await getTollOperatorDetailsById(userId);
    
    if (!operatorDetails) {
      return res.status(404).json({ message: 'Toll operator not found' });
    }

    res.status(200).json(operatorDetails);
  } catch (error) {
    console.error('Error fetching toll operator details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const sendInactiveUserRequest = async (req, res) => {
  const { userId } = req.body;

  try {
    const operator = await getTollOperatorDetailsById(userId);
    
    if (!operator) {
      return res.status(404).json({ message: 'User not found' });
    }

    const adminEmail = 'mufli2mail@gmail.com';
    const subject = 'Inactive User Access Request';
    const emailText = `
Dear Administrator,

An inactive user has requested access to the Highway Guardian system.

User Details:
- Name: ${operator.full_name}
- User ID: ${operator.user_id}
- Email: ${operator.email}
- Status: ${operator.status}
- Last Login: ${operator.last_login ? new Date(operator.last_login).toLocaleString() : 'Never'}

Please review this request and take appropriate action.

Best regards,
Highway Guardian System`;

    await sendEmail(adminEmail, subject, emailText);

    // Send confirmation email to user
    const userSubject = 'Access Request Received - Highway Guardian';
    const userEmailText = `
Dear ${operator.full_name},

We have received your request for account access. Our administrator has been notified and will review your request shortly.

If you have any urgent concerns, please contact us directly at support@highwayguardian.com.

Best regards,
Highway Guardian Team`;

    await sendEmail(operator.email, userSubject, userEmailText);

    return res.status(200).json({ message: 'Request sent successfully' });
  } catch (error) {
    console.error('Error sending inactive user request:', error);
    return res.status(500).json({ message: 'Failed to send request' });
  }
};

const getMonthlyTarget = async (req, res) => {
  try {
    // Get the current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get the toll booth ID for the logged-in operator
    const [operator] = await db.execute(
      'SELECT toll_booth_id FROM tolloperators WHERE id = ?',
      [req.operatorId]
    );

    if (!operator || operator.length === 0) {
      return res.status(404).json({ message: 'Operator not found' });
    }

    const tollBoothId = operator[0].toll_booth_id;

    // Get the current month's target
    const [currentTarget] = await db.execute(
      'SELECT * FROM monthlytargets WHERE toll_booth_id = ? AND month = ? AND year = ?',
      [tollBoothId, currentMonth, currentYear]
    );

    // Get the total amount collected this month
    const [currentAmount] = await db.execute(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE toll_booth_id = ? AND MONTH(timestamp) = ? AND YEAR(timestamp) = ?',
      [tollBoothId, currentMonth, currentYear]
    );

    // Get historical data for the past 6 months
    const [history] = await db.execute(`
      SELECT 
        mt.month,
        mt.year,
        mt.target_amount,
        COALESCE(SUM(t.amount), 0) as achieved_amount
      FROM monthlytargets mt
      LEFT JOIN transactions t ON 
        mt.toll_booth_id = t.toll_booth_id AND 
        MONTH(t.timestamp) = mt.month AND 
        YEAR(t.timestamp) = mt.year
      WHERE mt.toll_booth_id = ? AND
        (mt.year < ? OR (mt.year = ? AND mt.month <= ?))
      GROUP BY mt.month, mt.year
      ORDER BY mt.year DESC, mt.month DESC
      LIMIT 6
    `, [tollBoothId, currentYear, currentYear, currentMonth]);

    const target = currentTarget[0] || { target_amount: 0 };
    const current = currentAmount[0].total || 0;
    const progress = target.target_amount > 0 ? (current / target.target_amount) * 100 : 0;

    res.status(200).json({
      target_amount: target.target_amount,
      current_amount: current,
      progress: Math.round(progress),
      history: history
    });
  } catch (error) {
    console.error('Error fetching monthly target:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getTodaysProfit = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('1. Getting profit for userId:', userId);
    
    // First get the operator's toll booth ID
    const [operator] = await db.execute(
      'SELECT toll_booth_id FROM tolloperators WHERE user_id = ?',
      [userId]
    );
    console.log('2. Database response for operator:', operator);

    if (!operator || operator.length === 0) {
      console.log('3. No operator found for userId:', userId);
      return res.status(404).json({ message: 'Operator not found' });
    }

    const tollBoothId = operator[0].toll_booth_id;
    console.log('4. Found toll_booth_id:', tollBoothId);

    // Get today's profit with explicit date format
    const query = `
      SELECT profit_amount
      FROM dailyprofits 
      WHERE toll_booth_id = ? 
      AND date = '2025-05-29'
      LIMIT 1
    `;
    console.log('5. Executing query:', query, 'with tollBoothId:', tollBoothId);
    
    const [result] = await db.execute(query, [tollBoothId]);
    console.log('6. Profit query result:', result);
    
    // Check if we got any results
    if (!result || result.length === 0) {
      console.log('7. No profit record found for today');
      return res.status(200).json({ today_profit: 0 });
    }
    
    console.log('8. Sending profit amount:', result[0].profit_amount);
    res.status(200).json({
      today_profit: parseFloat(result[0].profit_amount) || 0
    });
  } catch (error) {
    console.error('Detailed error in getTodaysProfit:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  loginTollOperator,
  updateFirstTimeLogin,
  getTollOperatorDetails,
  sendInactiveUserRequest,
  getMonthlyTarget,
  getTodaysProfit
};
