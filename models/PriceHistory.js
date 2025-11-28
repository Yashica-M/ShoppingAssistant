const mongoose = require('mongoose');

const PriceHistorySchema = new mongoose.Schema({
    // We use the User's Search Query (e.g. "Dell Inspiron 15") as the ID
    productName: { type: String, required: true }, 
    source: { type: String, required: true }, // "Amazon" or "Flipkart"
    prices: [
        {
            price: Number,
            date: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('PriceHistory', PriceHistorySchema);
