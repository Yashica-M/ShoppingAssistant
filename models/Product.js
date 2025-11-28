const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  masterProductId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  category: {
    type: String
  },
  lastCheckDate: {
    type: Date
  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
