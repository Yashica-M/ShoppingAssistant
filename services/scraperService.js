const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// ==========================================
// 🧠 HELPER: EXTRACT OFFERS FROM TEXT
// ==========================================
function parseOffers(pageText, currentPrice) {
    if (!pageText || !currentPrice) return { discount: 0, effectivePrice: currentPrice, description: "" };

    const text = pageText.toLowerCase();
    let bestDiscount = 0;
    let offerDescription = "";

    // Debug: Log text to see what we are catching
    // console.log(`[Scraper] Analyzing text for offers: ${text.substring(0, 50)}...`); 

    // 1. Bank Offers (Broad matching)
    if (text.includes("10% instant discount") || text.includes("10% off") || text.includes("bank offer") || text.includes("instant discount")) {
        bestDiscount = currentPrice * 0.10;
        offerDescription = "10% Bank Offer";
        
        // Cap bank discount usually at ₹1500 if not specified (safe estimate)
        if (bestDiscount > 1500) bestDiscount = 1500;
    }
    
    // 2. Coupons (Save ₹X)
    if (text.includes("coupon")) {
        // Try to extract coupon amount if possible, else default to 500
        const couponMatch = text.match(/save ₹(\d+)/);
        const couponValue = couponMatch ? parseInt(couponMatch[1]) : 500;
        
        bestDiscount += couponValue;
        offerDescription = offerDescription ? offerDescription + " + Coupon" : "Coupon Applied";
    }

    // 3. Flipkart Specific (Axis Bank)
    if (text.includes("5% cashback") || text.includes("axis bank")) {
        const cashback = currentPrice * 0.05;
        if (cashback > bestDiscount) {
            bestDiscount = cashback;
            offerDescription = "5% Axis Cashback";
        }
    }

    // 4. Generic "Flat Off"
    if (text.includes("flat") && text.includes("off")) {
         const flatMatch = text.match(/flat ₹(\d+)/);
         if (flatMatch) {
             const flatOff = parseInt(flatMatch[1]);
             if (flatOff > bestDiscount) {
                 bestDiscount = flatOff;
                 offerDescription = "Flat Discount";
             }
         }
    }

    return {
        discount: Math.floor(bestDiscount),
        effectivePrice: Math.floor(currentPrice - bestDiscount),
        description: offerDescription || "No major offers found"
    };
}

// ==========================================
// 🧠 HELPER: STRICT MODEL MATCHING
// ==========================================
function isExactModelMatch(query, productTitle) {
    const title = productTitle.toLowerCase();
    const searchTerms = query.toLowerCase().split(' ');

    // Filter out generic words that don't define the model
    const ignoreWords = ['samsung', 'iphone', 'dell', 'hp', 'lenovo', 'mobile', 'phone', 'laptop', 'gen', '5g', '4g', 'apple', 'macbook', 'pro', 'air'];
    
    // Find the "Model Tokens" (e.g., "A10", "M07", "13", "15", "3520")
    // These are usually alphanumeric or numbers
    const modelTokens = searchTerms.filter(word => 
        !ignoreWords.includes(word) && // Not a generic word
        word.length >= 2 // Not a single letter
    );

    // If no model tokens found (e.g. user just searched "Samsung Phone"), perform loose matching
    if (modelTokens.length === 0) return true;

    // CHECK: Does the product title contain ALL key model tokens?
    // Example: Query "Samsung A10", Token "A10". Title "Samsung M07". Match = False.
    const isMatch = modelTokens.every(token => title.includes(token));

    return isMatch;
}

// ==========================================
// 🧠 HELPER: ADVANCED STRING SIMILARITY
// ==========================================
function getJaccardSimilarity(str1, str2) {
    // 1. Clean strings: Lowercase, remove special chars, extra spaces
    const clean = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const s1 = new Set(clean(str1).split(/\s+/));
    const s2 = new Set(clean(str2).split(/\s+/));

    // 2. Calculate Intersection (Common words)
    const intersection = new Set([...s1].filter(x => s2.has(x)));

    // 3. Calculate Union (Total unique words)
    const union = new Set([...s1, ...s2]);

    // 4. Return Score (0.0 to 1.0)
    return intersection.size / union.size;
}

// ==========================================
// 🧠 HELPER: CALCULATE MATCH SCORE
// ==========================================
function calculateMatchScore(item, target) {
    // 1. Price Variance Check (Hard Filter)
    // If price difference is > 60%, it's likely a different product (e.g., Case vs Phone)
    const priceDiffPercent = Math.abs(item.price - target.price) / target.price;
    if (priceDiffPercent > 0.6) return 0; // Automatic fail

    // 2. Text Similarity Score (0 to 100)
    const textScore = getJaccardSimilarity(item.title, target.title);

    // 3. Price Similarity Score (0 to 100)
    // Closer price = Higher score. 
    const priceScore = 1 - priceDiffPercent; 

    // 4. Final Weighted Score
    // Text matters more (70%), Price matters less (30%)
    const finalScore = (textScore * 0.7) + (priceScore * 0.3);

    return finalScore;
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= 1500){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function searchProduct(query) {
    const browser = await puppeteer.launch({
        headless: "new", // Run in background for production feel
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);

    // Block Images
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'font', 'stylesheet', 'media'].includes(req.resourceType())) req.abort();
        else req.continue();
    });

    let amazonResult = null;
    let flipkartCandidates = [];

    // ==========================================
    // 1. SCRAPE AMAZON (The Anchor)
    // ==========================================
    try {
        console.log("Navigating to Amazon...");
        let searchSuccess = false;
        try {
            await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector('#twotabsearchtextbox', { timeout: 5000 });
            await page.type('#twotabsearchtextbox', query, { delay: 50 });
            await page.keyboard.press('Enter');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
            searchSuccess = true;
        } catch(e) { console.log("Amazon typing failed, switching to direct URL"); }

        if (!searchSuccess) {
            await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }
        await autoScroll(page);

        amazonResult = await page.evaluate((searchQuery) => {
            const items = document.querySelectorAll('[data-component-type="s-search-result"]');
            for (const item of items) {
                const titleEl = item.querySelector('.a-text-normal');
                const priceEl = item.querySelector('.a-price-whole');
                const linkEl = item.querySelector('a.a-link-normal');
                
                if (!titleEl || !priceEl) continue;
                if (item.innerText.includes('Sponsored')) continue;
                if (!titleEl.innerText.toLowerCase().includes(searchQuery.split(" ")[0].toLowerCase())) continue;

                // 🔥 SCRAPE OFFERS TEXT
                // Amazon stores offers in text spans usually
                const offerText = item.innerText; 

                return {
                    title: titleEl.innerText,
                    price: parseInt(priceEl.innerText.replace(/[^0-9]/g, '')),
                    link: 'https://www.amazon.in' + (linkEl ? linkEl.getAttribute('href') : '#'),
                    source: 'Amazon',
                    raw_text_for_offers: offerText // Send text back to Node to parse
                };
            }
            return null;
        }, query);
        
        console.log("Amazon Anchor Product:", amazonResult ? `₹${amazonResult.price} - ${amazonResult.title.substring(0,30)}...` : "Not Found");

        // 🛡️ STRICT CHECK: Validate Amazon Result in Node.js
        if (amazonResult) {
            if (!isExactModelMatch(query, amazonResult.title)) {
                console.log(`❌ Amazon Mismatch: Searched "${query}", found "${amazonResult.title}". Discarding.`);
                amazonResult = null; // Kill the result if it's the wrong model
            } else {
                // Process Offer in Node.js
                const offerData = parseOffers(amazonResult.raw_text_for_offers, amazonResult.price);
                amazonResult.effective_price = offerData.effectivePrice;
                amazonResult.offer_text = offerData.description;
                delete amazonResult.raw_text_for_offers; // Cleanup
            }
        }

    } catch (error) { console.error("Amazon Failed:", error.message); }

    // ==========================================
    // 2. SCRAPE FLIPKART (The Candidates)
    // ==========================================
    try {
        console.log("Navigating to Flipkart...");
        await page.goto(`https://www.flipkart.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

        flipkartCandidates = await page.evaluate((searchQuery) => {
            const results = [];
            const allDivs = Array.from(document.querySelectorAll('div'));
            const priceDivs = allDivs.filter(div => div.innerText.includes('₹') && div.innerText.length < 50);

            for (const pDiv of priceDivs) {
                const productCard = pDiv.closest('div[data-id]') || pDiv.closest('a');
                if (productCard) {
                    let possibleTitles = Array.from(productCard.querySelectorAll('div, a'));
                    let titleEl = possibleTitles.find(el => 
                        el.innerText.toLowerCase().includes(searchQuery.split(' ')[0].toLowerCase()) && 
                        el.innerText.length > 10 && 
                        !el.innerText.includes('₹')
                    );
                    
                    if (titleEl) {
                        const rawPrice = pDiv.innerText; 
                        const priceMatch = rawPrice.match(/₹([0-9,]+)/);
                        if (priceMatch) {
                            const cleanPrice = parseInt(priceMatch[1].replace(/,/g, ''));
                            let linkEl = productCard.tagName === 'A' ? productCard : productCard.querySelector('a');
                            let finalLink = linkEl ? linkEl.href : 'https://www.flipkart.com';

                            const exists = results.some(r => r.link === finalLink);
                            if (!exists) {
                                results.push({
                                    title: titleEl.innerText.split('\n')[0],
                                    price: cleanPrice,
                                    link: finalLink,
                                    source: 'Flipkart',
                                    raw_text_for_offers: productCard.innerText // Capture text for offers
                                });
                            }
                        }
                    }
                }
                if (results.length >= 10) break; // Get top 10 candidates
            }
            return results;
        }, query);
        console.log(`Flipkart found ${flipkartCandidates.length} candidates.`);

        // 🛡️ STRICT CHECK: Filter Flipkart Candidates
        // Only keep candidates that actually match the model number
        const strictCandidates = flipkartCandidates.filter(item => isExactModelMatch(query, item.title));
        
        if (strictCandidates.length > 0) {
            console.log(`Filtered down to ${strictCandidates.length} strict matches out of ${flipkartCandidates.length}.`);
            flipkartCandidates = strictCandidates; // Use only strict matches
        } else {
            console.log("No strict model matches found on Flipkart.");
        }

    } catch (error) { console.error("Flipkart Failed:", error.message); }

    await browser.close();

    // ==========================================
    // 3. INTELLIGENT MATCHING SYSTEM
    // ==========================================
    let bestFlipkartMatch = { title: "Not Found", price: "0", link: "#" };

    if (amazonResult && flipkartCandidates.length > 0) {
        console.log("Analyzing Best Match...");
        
        let highestScore = -1;

        flipkartCandidates.forEach(item => {
            // Run the Multi-Factor Scoring
            const score = calculateMatchScore(item, amazonResult);
            console.log(`Candidate: ₹${item.price} | Score: ${score.toFixed(2)} | Title: ${item.title.substring(0, 20)}...`);

            if (score > highestScore) {
                highestScore = score;
                bestFlipkartMatch = item;
            }
        });
        
        // If the best score is too low (e.g., < 0.2), implies NO match found
        if (highestScore < 0.2) {
             console.log("No confident match found on Flipkart.");
             bestFlipkartMatch = { title: "No exact match found", price: "0", link: "#" };
        }

        // Format for Frontend
        amazonResult.price = amazonResult.price.toString();
        bestFlipkartMatch.price = bestFlipkartMatch.price.toString();

        // Process Offer for Flipkart
        if (bestFlipkartMatch.price !== "0") {
            const offerData = parseOffers(bestFlipkartMatch.raw_text_for_offers, parseInt(bestFlipkartMatch.price));
            bestFlipkartMatch.effective_price = offerData.effectivePrice;
            bestFlipkartMatch.offer_text = offerData.description;
            delete bestFlipkartMatch.raw_text_for_offers; // Cleanup
        }

    } else if (flipkartCandidates.length > 0) {
        // Fallback: If Amazon failed, return top Flipkart result
        bestFlipkartMatch = flipkartCandidates[0];
        bestFlipkartMatch.price = bestFlipkartMatch.price.toString();
        
        // Process Offer for Flipkart
        const offerData = parseOffers(bestFlipkartMatch.raw_text_for_offers, parseInt(bestFlipkartMatch.price));
        bestFlipkartMatch.effective_price = offerData.effectivePrice;
        bestFlipkartMatch.offer_text = offerData.description;
        delete bestFlipkartMatch.raw_text_for_offers; // Cleanup

    } else if (amazonResult) {
        amazonResult.price = amazonResult.price.toString();
    }

    const finalResults = {
        amazon: amazonResult || { title: "Not Found", price: "0", link: "#" },
        flipkart: bestFlipkartMatch
    };

    return finalResults;
}

module.exports = { searchProduct };