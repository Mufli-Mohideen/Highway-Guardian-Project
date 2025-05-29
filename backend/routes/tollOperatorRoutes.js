const express = require('express');
const { loginTollOperator, updateFirstTimeLogin, getTollOperatorDetails, sendInactiveUserRequest, getMonthlyTarget, getTodaysProfit } = require('../controllers/tollOperatorController');
const { verifyToken } = require('../middleware/authMiddleware');
const tollOperatorModel = require('../models/tollOperatorModel');
const router = express.Router();

console.log('Toll operator router file loaded.');

router.post('/login', (req, res, next) => {
  console.log('POST /toll-operators/login route called');
  next();
}, loginTollOperator);

router.put('/update-first-login', updateFirstTimeLogin);

router.get('/details/:userId', verifyToken, getTollOperatorDetails);

router.post('/request-access', sendInactiveUserRequest);

router.get('/monthly-target', verifyToken, getMonthlyTarget);

router.get('/todays-profit/:userId', verifyToken, getTodaysProfit);

// Add new route for profit data
router.get('/profit/:userId', verifyToken, async (req, res) => {
    try {
        const profitData = await tollOperatorModel.getProfitData(req.params.userId);
        if (!profitData) {
            return res.status(404).json({ message: 'Profit data not found' });
        }
        res.json(profitData);
    } catch (error) {
        console.error('Error in profit route:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add route for detailed profit report
router.get('/profit-report/:userId', verifyToken, async (req, res) => {
    try {
        const reportData = await tollOperatorModel.getDetailedProfitReport(req.params.userId);
        if (!reportData) {
            return res.status(404).json({ message: 'Report data not found' });
        }
        res.json(reportData);
    } catch (error) {
        console.error('Error in profit report route:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
