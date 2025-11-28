const axios = require('axios');

async function callGeminiAI(promptText) {
    const apiKey = process.env.GEMINI_API_KEY; 
    
    // ✅ TRYING: gemini-2.0-flash (Found in Doctor Script)
    // We send the Key in the HEADER (x-goog-api-key) which is more stable than the URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

    const payload = {
        contents: [{
            parts: [{ text: promptText }]
        }]
    };

    try {
        const response = await axios.post(url, payload, {
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey // sending key in header
            }
        });
        
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            console.log("Empty Response");
            return null;
        }

    } catch (error) {
        console.error("AI Error:", error.response?.status);
        // Print the EXACT list of allowed models from the error message if Google sends it
        console.error("Details:", JSON.stringify(error.response?.data)); 
        return null;
    }
}

async function getAIAdvice(amazonItem, flipkartItem, query) {
    if (!amazonItem || !flipkartItem) return null;

    const prompt = `
    You are a Shopping Fraud Detector and Price Analyst.
    
    User Search: "${query}"
    
    1. Amazon Result: "${amazonItem.title}" at ₹${amazonItem.price}
    2. Flipkart Result: "${flipkartItem.title}" at ₹${flipkartItem.price}

    Analyze this data for two things:
    
    1. **Trust Score (0-100%):** 
       - If the price is unrealistically low (e.g., iPhone 15 for ₹5000), it's a SCAM/FAKE. Score should be 10%.
       - If the title says "Cover", "Case", "Skin" but the user searched for the phone, it's a MISMATCH. Score should be 30%.
       - If prices are realistic (e.g. ₹50k vs ₹49k), Score should be 90-100%.

    2. **Buying Advice:**
       - Compare specs (RAM, Version).
       - Recommend the best value.
    
    Format the output strictly as a JSON Object like this:
    {
      "amazon_trust_score": 95,
      "flipkart_trust_score": 98,
      "verdict_title": "Flipkart is the Winner",
      "key_differences": ["Amazon has older 11th Gen", "Flipkart has newer 13th Gen", "Amazon includes Office 2021"],
      "recommendation": "Buy Flipkart for performance."
    }
    `;

    try {
        const text = await callGeminiAI(prompt);
        if (!text) throw new Error("No response from AI");

        // Clean up markdown code blocks if present
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("AI Service Error:", error.message);
        // Return a safe fallback object so the UI doesn't break
        return {
            amazon_trust_score: 50,
            flipkart_trust_score: 50,
            verdict_title: "AI Analysis Unavailable",
            key_differences: ["AI service is currently unreachable.", "Please compare prices manually."],
            recommendation: "Check both retailers carefully."
        };
    }
}

module.exports = { getAIAdvice };