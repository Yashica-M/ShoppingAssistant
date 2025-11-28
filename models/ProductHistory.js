const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
    productName: { type: String, required: true }, // Normalized name (e.g., "iphone 15")
    source: { type: String, required: true }, // "Amazon" or "Flipkart"
    priceHistory: [
        {
            price: Number,
            date: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('ProductHistory', HistorySchema);