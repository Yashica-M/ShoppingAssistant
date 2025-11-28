const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const multer = require('multer');

// Configure Multer (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

// Route to handle real-time search and comparison
router.get('/live', searchController.search);

// Route to get price history and prediction
router.get('/history', searchController.getHistory);

// Route for Smart Bundle Search
router.post('/bundle', searchController.bundleSearch);

// Route for Visual Search
router.post('/visual', upload.single('image'), searchController.visualSearch);

module.exports = router;