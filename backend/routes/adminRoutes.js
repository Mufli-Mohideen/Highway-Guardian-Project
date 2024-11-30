const express = require('express');
const { loginAdmin } = require('../controllers/adminController');
const router = express.Router();

console.log('Admin router file loaded.');

router.post('/login', (req, res, next) => {
  console.log('POST /admin/login route called');
  next();
}, loginAdmin);

module.exports = router;
