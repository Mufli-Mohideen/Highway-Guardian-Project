const express = require('express');
const { loginAdmin, addTollBooth, getTollBooths, addTollOperator, getTollOperators, updateTollBooth, deleteTollBooth, updateTollOperator, deleteTollOperator } = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

console.log('Admin router file loaded.');

router.post('/login', (req, res, next) => {
  console.log('POST /admin/login route called');
  next();
}, loginAdmin);

router.post('/add-toll-booth', verifyToken, addTollBooth);
router.post('/add-toll-operator', verifyToken, addTollOperator);

router.get('/get-toll-booths', verifyToken, getTollBooths);
router.get('/get-toll-operators', verifyToken, getTollOperators);

router.put('/update-toll-booth/:id', (req, res, next) => {
  console.log('PUT /admin/update-toll-booth/:id route called', {
    id: req.params.id,
    body: req.body
  });
  next();
}, verifyToken, updateTollBooth);

// Delete toll booth route with enhanced logging
router.delete('/delete-toll-booth/:id', (req, res, next) => {
  console.log('DELETE route accessed:', {
    url: req.originalUrl,
    method: req.method,
    params: req.params,
    headers: {
      authorization: req.headers.authorization ? 'Bearer token present' : 'No token',
      'content-type': req.headers['content-type']
    }
  });
  next();
}, verifyToken, deleteTollBooth);

// Update toll operator route with enhanced logging
router.put('/update-toll-operator/:id', (req, res, next) => {
  console.log('PUT /admin/update-toll-operator/:id route called', {
    id: req.params.id,
    body: req.body,
    headers: {
      authorization: req.headers.authorization ? 'Bearer token present' : 'No token',
      'content-type': req.headers['content-type']
    }
  });
  next();
}, verifyToken, updateTollOperator);

// Delete toll operator route
router.delete('/delete-toll-operator/:id', (req, res, next) => {
  console.log('DELETE /admin/delete-toll-operator/:id route called', {
    id: req.params.id,
    headers: {
      authorization: req.headers.authorization ? 'Bearer token present' : 'No token',
      'content-type': req.headers['content-type']
    }
  });
  next();
}, verifyToken, deleteTollOperator);

module.exports = router;
