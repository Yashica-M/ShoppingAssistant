require('dotenv').config();

async function list() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("API Key not found in .env");
        return;
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach(m => {
                // Filter for models that support content generation
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("Error response:", data);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
list();