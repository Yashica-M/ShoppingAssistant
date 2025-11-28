const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGO_URI = 'mongodb://localhost:27017/shopsense';

const sampleProducts = [
    {
        masterProductId: "DELL-I7-3520",
        name: "Dell Inspiron 15 3520 Laptop, Intel Core i7-1255U Processor, 16GB, 512GB SSD, 15.6\" (39.62cm) FHD 120Hz 250 nits Display, Backlit KB, Win 11 + MSO'21, 15 Month McAfee, Silver, 1.65kg",
        category: "Laptops"
    },
    {
        masterProductId: "SONY-WH-1000XM5",
        name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones, 30 Hours Battery Life, Quick Charge, Hands Free Calling, Integrated Processor V1 (Black)",
        category: "Headphones"
    },
    {
        masterProductId: "APPLE-IPHONE-15",
        name: "Apple iPhone 15 (128 GB) - Black",
        category: "Smartphones"
    }
];

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('✅ MongoDB connected for seeding.');
        
        try {
            // Clear existing products to avoid duplicates during development
            await Product.deleteMany({});
            console.log('🗑️ Cleared existing products.');

            // Insert new products
            await Product.insertMany(sampleProducts);
            console.log('🌱 Database seeded successfully with Master Products.');
        } catch (error) {
            console.error('❌ Error seeding database:', error);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
    });
