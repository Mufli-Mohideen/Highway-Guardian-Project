const express = require('express');
const { loginAdmin, addTollBooth } = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

console.log('Admin router file loaded.');

router.post('/login', (req, res, next) => {
  console.log('POST /admin/login route called');
  next();
}, loginAdmin);

router.post('/add-toll-booth', verifyToken, addTollBooth);

module.exports = router;
