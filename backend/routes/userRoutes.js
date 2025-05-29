const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');


router.get('/details/:nic', verifyToken, userController.getUserByNIC);

module.exports = router;
