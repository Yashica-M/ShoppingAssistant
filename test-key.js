require('dotenv').config();
const axios = require('axios');

async function testKey() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ ERROR: GEMINI_API_KEY is missing in .env");
        return;
    }
    console.log("🔑 Testing Key ending in: ..." + apiKey.slice(-4));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hello, reply with 'OK' if this works." }] }]
        });
        if (response.data.candidates && response.data.candidates.length > 0) {
             console.log("✅ SUCCESS! AI Replied:", response.data.candidates[0].content.parts[0].text);
        } else {
             console.log("⚠️ AI connected but returned no text.");
        }
       
    } catch (error) {
        console.error("❌ FAILED. Reason:", error.response?.data?.error?.message || error.message);
        if (error.response?.status === 404) {
            console.error("👉 DIAGNOSIS: The API Key is likely invalid, restricted, or meant for YouTube only.");
        }
    }
}

testKey();