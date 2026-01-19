require('dotenv').config(); // Load your API Key

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    // We check the v1 endpoint first as it is the most stable
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("✅ YOUR KEY SUPPORTS THESE MODELS:");
            data.models.forEach(m => {
                console.log(`- ${m.name.replace('models/', '')}`);
            });
        } else {
            console.log("❌ Error:", data);
        }
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

checkModels();