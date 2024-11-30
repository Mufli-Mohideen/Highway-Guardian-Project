const express = require('express');
const { loginTollOperator } = require('../controllers/tollOperatorController');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

console.log('Toll operator router file loaded.');

router.post('/login', (req, res, next) => {
  console.log('POST /toll-operators/login route called');
  next();
}, loginTollOperator);


module.exports = router;
