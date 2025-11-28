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

async function getYouTubeReview(productName) {
    try {
        // 1. Search YouTube
        const youtubeUrl = 'https://www.googleapis.com/youtube/v3/search';
        const response = await axios.get(youtubeUrl, {
            params: {
                part: 'snippet',
                q: `${productName} review`,
                type: 'video',
                maxResults: 1,
                order: 'relevance',
                key: process.env.YOUTUBE_API_KEY
            }
        });

        if (!response.data.items || response.data.items.length === 0) {
            return null;
        }

        const video = response.data.items[0];
        const videoId = video.id.videoId;
        const title = video.snippet.title;
        const description = video.snippet.description;
        const thumbnail = video.snippet.thumbnails.high.url;

        // 2. Analyze with Gemini
        const prompt = `
        Analyze this video description for the product "${productName}".
        
        Video Title: "${title}"
        Video Description: "${description}"
        
        Task:
        1. Determine the sentiment: "Positive", "Negative", or "Mixed".
        2. Summarize the reviewer's verdict in one short, punchy sentence (max 20 words).
        
        Output strictly as JSON:
        {
            "sentiment": "Positive",
            "ai_summary": "The summary here."
        }
        `;

        const text = await callGeminiAI(prompt);
        if (!text) throw new Error("No response from AI");

        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonString);

        return {
            videoId,
            title,
            thumbnail,
            sentiment: analysis.sentiment,
            ai_summary: analysis.ai_summary
        };

    } catch (error) {
        console.error("YouTube/AI Error:", error.message);
        return null;
    }
}

module.exports = { getYouTubeReview };
