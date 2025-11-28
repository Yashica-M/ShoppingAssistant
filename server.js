// File: server.js (FINAL UPDATE)
console.log("🚀 Server starting... Applying Gemini 1.5 Flash Fix...");
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import the new routers
const searchRoutes = require('./routes/search'); 
const predictionRoutes = require('./routes/prediction'); // NEW IMPORT
const reviewRoutes = require('./routes/review'); // NEW IMPORT

const app = express();
const MONGO_URI = 'mongodb://localhost:27017/shopsense';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected successfully.'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
// 1. Search and Real-Time Comparison
app.use('/api/search', searchRoutes); 
// 2. ML Prediction (The Innovation)
app.use('/api/products', predictionRoutes); // NEW ROUTE
// 3. YouTube Review & Sentiment
app.use('/api/review', reviewRoutes); // NEW ROUTE

// Basic default route
app.get('/', (req, res) => {
    res.send('ShopSense API is fully operational.');
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("🔥 Global Error:", err.stack);
    res.status(500).json({ 
        status: 'error', 
        message: 'Something went wrong on the server.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 ShopSense API running on http://localhost:${PORT}`);
});