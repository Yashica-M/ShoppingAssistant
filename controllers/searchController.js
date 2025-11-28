const NodeCache = require("node-cache");
const { searchProduct } = require('../services/scraperService');
const { getAIAdvice } = require('../services/aiService');
const PriceHistory = require('../models/PriceHistory');

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// HELPER: Calculate Prediction (Fixed for NaN Safety)
function calculatePrediction(historyArray) {
    if (!historyArray || historyArray.length < 2) {
        return { direction: "Neutral", predictedPrice: 0, potentialSavings: 0, advice: "Neutral" };
    }

    // Ensure all prices are Numbers
    const prices = historyArray.map(p => Number(p.price));
    const currentPrice = prices[prices.length - 1];
    
    // 1. Calculate Statistics
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    
    // Determine Trend
    const startPrice = prices[0];
    const trend = currentPrice < startPrice ? "down" : "up";

    // 2. Predict Future Price
    let predictedLow = 0;
    
    if (trend === "down") {
        // If trending down, predict it drops another 3%
        predictedLow = Math.floor(currentPrice * 0.97); 
    } else {
        // If trending up/stable, expect it might dip back to average
        predictedLow = Math.floor(avg);
    }

    // Safety: Prediction shouldn't be higher than current for "Wait" advice
    if (predictedLow > currentPrice) predictedLow = currentPrice;

    const potentialSavings = currentPrice - predictedLow;

    return {
        direction: trend,
        predictedPrice: predictedLow,
        potentialSavings: potentialSavings,
        // If savings are significant (> ₹500), tell them to wait
        advice: potentialSavings > 500 ? "WAIT" : "BUY NOW"
    };
}

// HELPER: Calculate Financial Analysis (True Cost)
function calculateFinancials(productName, price) {
    if (!price || isNaN(price) || price === 0) return null;

    const lowerName = productName.toLowerCase();
    const isApple = lowerName.includes('apple') || lowerName.includes('iphone') || lowerName.includes('macbook');
    
    // Depreciation Rate: Apple 20%, Others 35%
    const depreciationRate = isApple ? 0.20 : 0.35;
    
    // Resale Value after 2 years: Price * (1 - rate)^2
    const resaleValue = Math.floor(price * Math.pow((1 - depreciationRate), 2));
    
    // Net Cost of Ownership
    const netCost = price - resaleValue;
    
    // Real Daily Cost (over 2 years / 730 days)
    const dailyCost = Math.floor(netCost / 730);
    
    // EMI Calculation (12 months @ 14% interest)
    // Formula: [P x R x (1+R)^N]/[(1+R)^N-1]
    // Simplified estimation: (Principal + Interest) / 12
    const interestRate = 0.14;
    const totalInterest = price * interestRate;
    const monthlyEMI = Math.floor((price + totalInterest) / 12);

    return {
        isHighResale: isApple,
        resaleValue: resaleValue,
        netCost: netCost,
        dailyCost: dailyCost,
        monthlyEMI: monthlyEMI,
        depreciationRate: depreciationRate * 100
    };
}

// Helper: Save price and get prediction
async function getPriceTrend(query, source, currentPrice) {
    if (!currentPrice || currentPrice === '0' || currentPrice === 0) return "No data available.";

    // Normalize query (lowercase) so "Dell" and "dell" are the same
    const cleanQuery = query.toLowerCase().trim();
    const priceNum = parseInt(currentPrice.toString().replace(/[^0-9]/g, ''));
    if (isNaN(priceNum) || priceNum === 0) return "No data available.";

    // 1. Find existing history
    let record = await PriceHistory.findOne({ productName: cleanQuery, source: source });

    if (!record) {
        // First time searching this! Save it.
        record = new PriceHistory({
            productName: cleanQuery,
            source: source,
            prices: [{ price: priceNum }]
        });
        await record.save();
        return "🆕 First time tracking this item. We will build a history soon!";
    }

    // 2. Add new price point
    record.prices.push({ price: priceNum });
    await record.save();

    // 3. ANALYZE HISTORY (The Math)
    const history = record.prices.map(p => p.price);
    const minPrice = Math.min(...history);
    const maxPrice = Math.max(...history);
    const avgPrice = history.reduce((a, b) => a + b, 0) / history.length;

    // 4. Generate Advice
    if (priceNum <= minPrice) {
        return "🔥 BUY NOW! This is the lowest price ever recorded!";
    } else if (priceNum > avgPrice) {
        return `⚠️ Price is high. Historic Low was ₹${minPrice}. Advice: Wait.`;
    } else {
        return `📉 Price is stable (Avg: ₹${Math.floor(avgPrice)}). Good time to buy.`;
    }
}

async function search(req, res) {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ status: 'error', message: 'Missing search query parameter.' });
    }

    // Check Cache
    const cacheKey = query.toLowerCase().trim();
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
        console.log(`⚡ Serving "${query}" from Cache`);
        return res.status(200).json(cachedResult);
    }

    try {
        // 1. Run Scraper
        const results = await searchProduct(query);
        
        // 2. Get AI Advice
        const aiAdvice = await getAIAdvice(results.amazon, results.flipkart, query);
        
        // 3. Get Price Trends
        const amazonTrend = await getPriceTrend(query, 'Amazon', results.amazon ? results.amazon.price : 0);
        const flipkartTrend = await getPriceTrend(query, 'Flipkart', results.flipkart ? results.flipkart.price : 0);

        // 4. Calculate Financials (True Cost)
        // Use the lower price for calculation if available
        const bestPrice = Math.min(
            results.amazon && results.amazon.price ? results.amazon.price : Infinity,
            results.flipkart && results.flipkart.price ? results.flipkart.price : Infinity
        );
        
        let financialAnalysis = null;
        if (bestPrice !== Infinity) {
            financialAnalysis = calculateFinancials(query, bestPrice);
        }

        // Attach data
        if (results.amazon) results.amazon.trend = amazonTrend;
        if (results.flipkart) results.flipkart.trend = flipkartTrend;

        const responseData = {
            products: [
                results.amazon || { status: 'error', retailer: 'Amazon.in', message: 'Scraping failed' },
                results.flipkart || { status: 'error', retailer: 'Flipkart', message: 'Scraping failed' }
            ],
            ai_advice: aiAdvice, // Now a JSON object
            financials: financialAnalysis // New Financial Data
        };

        // Save to Cache
        cache.set(cacheKey, responseData);

        res.status(200).json(responseData);
        
    } catch (error) {
        console.error("Search Controller Error:", error);
        res.status(500).json({ status: 'error', message: 'An internal error occurred.' });
    }
}

async function getHistory(req, res) {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query required" });

    try {
        const cleanQuery = query.toLowerCase().trim();
        let record = await PriceHistory.findOne({ productName: cleanQuery });

        let graphData = [];
        
        // --- 1. PREPARE DATA SOURCE ---
        const today = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // If no DB record, or record has too few points, GENERATE MOCK DATA
        if (!record || record.prices.length < 2) {
            // Use the actual current price if available, otherwise default to 50k
            const currentPrice = record && record.prices.length > 0 
                ? record.prices[record.prices.length-1].price 
                : 50000;

            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                
                // Create realistic volatility (Sine wave + random noise)
                const volatility = Math.sin(i) * (currentPrice * 0.05); // 5% variance
                const randomNoise = Math.random() * (currentPrice * 0.01);
                
                graphData.push({
                    date: days[d.getDay()],
                    price: Math.floor(currentPrice + volatility + randomNoise)
                });
            }
            // Ensure the last point matches the "Current" price exactly
            graphData[6].price = currentPrice;

        } else {
            // USE REAL DB DATA
            // Map the last 7 entries
            const recentPrices = record.prices.slice(-7); 
            graphData = recentPrices.map(p => ({
                date: days[new Date(p.date).getDay()],
                price: p.price
            }));
        }

        // --- 2. RUN PREDICTION ---
        const analysis = calculatePrediction(graphData);

        res.json({ 
            graphData, 
            prediction: analysis 
        });

    } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ error: error.message });
    }
}

async function bundleSearch(req, res) {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Invalid items array.' });
    }
    try {
        // Run all searches in parallel
        const searchPromises = items.map(item => searchProduct(item));
        const results = await Promise.all(searchPromises);

        // Helper: Strip commas and non-digits to get clean number
        const parsePrice = (p) => {
            if (p === undefined || p === null) return 0;
            // If already a number, return integer
            if (typeof p === 'number' && !isNaN(p)) return Math.floor(p);
            const cleaned = p.toString().replace(/[^0-9]/g, '');
            if (cleaned === '') return 0;
            const num = parseInt(cleaned, 10);
            return isNaN(num) ? 0 : num;
        };

        let amazonSum = 0;
        let flipkartSum = 0;
        let mixedSum = 0;

        let amazonValid = true;
        let flipkartValid = true;

        const optimizationStrategy = [];

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const query = items[i];

            const amzRaw = result.amazon && result.amazon.price ? result.amazon.price : null;
            const flpRaw = result.flipkart && result.flipkart.price ? result.flipkart.price : null;

            let amzPrice = parsePrice(amzRaw);
            let flipPrice = parsePrice(flpRaw);

            // Treat missing or zero prices as unavailable
            if (!amzRaw || amzPrice === 0) { amazonValid = false; amzPrice = Infinity; }
            if (!flpRaw || flipPrice === 0) { flipkartValid = false; flipPrice = Infinity; }

            // Choose cheapest available for mixed strategy
            if (amzPrice < flipPrice) {
                mixedSum += amzPrice;
                optimizationStrategy.push({
                    item: query,
                    buyFrom: 'Amazon',
                    price: amzPrice,
                    link: result.amazon && result.amazon.link ? result.amazon.link : null
                });
            } else if (flipPrice < amzPrice) {
                mixedSum += flipPrice;
                optimizationStrategy.push({
                    item: query,
                    buyFrom: 'Flipkart',
                    price: flipPrice,
                    link: result.flipkart && result.flipkart.link ? result.flipkart.link : null
                });
            } else {
                // Both Infinity (unavailable everywhere)
                mixedSum = Infinity;
                optimizationStrategy.push({
                    item: query,
                    buyFrom: 'Unavailable',
                    price: Infinity,
                    link: null
                });
            }

            // Running Totals (Only add if valid)
            amazonSum += (amzPrice === Infinity ? 0 : amzPrice);
            flipkartSum += (flipPrice === Infinity ? 0 : flipPrice);
        }

        // Prepare response values (human-friendly)
        const amazonTotal = amazonValid ? amazonSum : 'Item(s) Out of Stock';
        const flipkartTotal = flipkartValid ? flipkartSum : 'Item(s) Out of Stock';

        const smartSplitTotal = mixedSum === Infinity ? 'Unavailable' : mixedSum;

        // Format strategy for frontend: replace Infinity with 'N/A'
        const strategy = optimizationStrategy.map(s => ({
            ...s,
            price: s.price === Infinity ? 'N/A' : s.price
        }));

        // Calculate savings if possible
        let savings = 0;
        const numericAmazon = typeof amazonSum === 'number' ? amazonSum : Infinity;
        const numericFlip = typeof flipkartSum === 'number' ? flipkartSum : Infinity;
        const cheapestSingleStore = Math.min(numericAmazon, numericFlip);
        if (smartSplitTotal !== 'Unavailable' && cheapestSingleStore !== Infinity) {
            savings = Math.max(0, cheapestSingleStore - mixedSum);
        }

        res.status(200).json({
            amazonTotal,
            flipkartTotal,
            smartSplitTotal,
            savings,
            strategy
        });

    } catch (error) {
        console.error("Bundle Search Error:", error);
        res.status(500).json({ status: 'error', message: 'Bundle search failed.' });
    }
}

// VISUAL SEARCH CONTROLLER
const visualSearch = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // SIMULATION: In a real app, we would send req.file.buffer to an AI Vision API (Google Vision, AWS Rekognition)
        // Here, we will simulate a delay and return a "detected" product.
        
        console.log(`Analyzing image: ${req.file.originalname} (${req.file.size} bytes)`);

        // Simulate AI processing time
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock Logic: Randomly select a product to "detect"
        const mockDetections = [
            "Sony WH-1000XM5",
            "iPhone 14",
            "MacBook Air M2",
            "Samsung Galaxy S23",
            "Logitech MX Master 3S"
        ];
        const detectedProduct = mockDetections[Math.floor(Math.random() * mockDetections.length)];

        res.json({ 
            success: true, 
            detectedQuery: detectedProduct,
            confidence: 0.98,
            message: "Object identified successfully"
        });

    } catch (error) {
        console.error("Visual Search Error:", error);
        res.status(500).json({ error: "Failed to analyze image" });
    }
};

module.exports = { search, getHistory, bundleSearch, visualSearch };