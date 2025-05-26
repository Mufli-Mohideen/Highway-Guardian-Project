const express = require('express');
const { loginTollOperator, updateFirstTimeLogin, getTollOperatorDetails, sendInactiveUserRequest } = require('../controllers/tollOperatorController');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

console.log('Toll operator router file loaded.');

router.post('/login', (req, res, next) => {
  console.log('POST /toll-operators/login route called');
  next();
}, loginTollOperator);

router.put('/update-first-login', updateFirstTimeLogin);

router.get('/details/:userId', verifyToken, getTollOperatorDetails);

router.post('/request-access', sendInactiveUserRequest);

module.exports = router;
