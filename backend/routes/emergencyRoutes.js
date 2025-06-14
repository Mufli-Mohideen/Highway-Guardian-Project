const express = require('express');
const router = express.Router();
const { getActiveEmergency, updateStatus, getTodaysEmergencies } = require('../controllers/emergencyController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/active', verifyToken, getActiveEmergency);
router.get('/today', verifyToken, getTodaysEmergencies);

router.post('/update-status', verifyToken, updateStatus);

module.exports = router; 