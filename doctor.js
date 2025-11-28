require('dotenv').config();
const axios = require('axios');

async function checkModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("❌ ERROR: GEMINI_API_KEY is missing in .env");
        return;
    }
    console.log(`🔍 Checking available models for key ending in ...${key.slice(-4)}`);

    try {
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        );

        console.log("\n✅ SUCCESS! Your Key works. You have access to these models:");
        
        // Filter and print only 'generateContent' models
        const models = response.data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""));
            
        models.forEach(m => console.log(`   👉 ${m}`));

        console.log("\n💡 UPDATE your server.js to use one of the names above exactly.");

    } catch (error) {
        console.error("\n❌ FATAL ERROR:", error.response?.status, error.response?.statusText);
        console.error("Reason:", JSON.stringify(error.response?.data));
    }
}

checkModels();