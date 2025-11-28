const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const Product = require('../models/Product'); // Import Product model

// Path to the Python executable in the ml_service's virtual environment
const pythonExecutable = path.join(__dirname, '..', 'ml_service', 'venv', 'Scripts', 'python.exe');
// Path to the predictor script
const predictorScript = path.join(__dirname, '..', 'ml_service', 'price_predictor.py');

// Utility function to execute the Python ML script
function runPythonPredictor(productId, currentPrice) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ productId, currentPrice });

        const pythonProcess = spawn(pythonExecutable, [predictorScript, payload], {
            // ML models can take longer to load/run, extend timeout slightly
            timeout: 30000, // 30 seconds
            killSignal: 'SIGTERM'
        });

        let dataFromPython = '';
        let errorFromPython = '';

        pythonProcess.stdout.on('data', (data) => {
            dataFromPython += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorFromPython += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(dataFromPython));
                } catch (e) {
                    console.error("ML output was not valid JSON:", dataFromPython);
                    reject(new Error("Invalid data format from predictor."));
                }
            } else {
                console.error(`Python ML script exited with code ${code}. Stderr: ${errorFromPython}`);
                reject(new Error(`Predictor failed. Check logs. Code: ${code}`));
            }
        });

        pythonProcess.on('error', (err) => {
             if (err.code === 'ETIMEDOUT') {
                reject(new Error("Prediction operation timed out after 30 seconds."));
            } else {
                reject(new Error(`Failed to start predictor process: ${err.message}`));
            }
        });
    });
}

// Route to get the buying recommendation for a specific product
router.post('/:productId/recommendation', async (req, res) => {
    const { productId } = req.params;
    const { currentPrice } = req.body; // Price must be passed via request body

    if (!currentPrice || isNaN(parseFloat(currentPrice))) {
        return res.status(400).json({ status: 'error', message: 'Current price is required for prediction.' });
    }

    try {
        const recommendation = await runPythonPredictor(productId, parseFloat(currentPrice));
        res.status(200).json(recommendation);
    } catch (error) {
        console.error("Prediction API failure:", error.message);
        res.status(500).json({ status: 'error', message: 'Internal prediction error.' });
    }
});

// NEW ROUTE: Get all master products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json(products);
    } catch (error) {
        console.error("Failed to fetch products:", error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch products.' });
    }
});

module.exports = router;