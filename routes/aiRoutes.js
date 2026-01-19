const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const axios = require("axios"); // For Hugging Face fallback
const NodeCache = require("node-cache"); // For preventing repeated API hits
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Cache (resets on server restart, saves your quota during the demo)
const myCache = new NodeCache({ stdTTL: 3600 }); 

// 1. Primary Model: Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    apiVersion: "v1" 
});

// 2. Fallback Model: Hugging Face (Mistral)
const HF_API_KEY = process.env.HF_TOKEN; 
const HF_ENDPOINT = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";

// Load Local Data
const dataPath = path.join(__dirname, "..", "data", "data.json");
let ipcData = [];
try {
    ipcData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
} catch (err) { console.error("JSON Load Error:", err); }

router.post("/ask-nyaya", async (req, res) => {
    const { query } = req.body;
    
    // Step A: Check Cache first (Judge asks the same thing? Instant response!)
    const cachedResponse = myCache.get(query);
    if (cachedResponse) return res.json({ answer: cachedResponse, source: "Cache" });

    // Step B: Match Local Data (The "Nyaya-AI" logic)
    const numbersFound = query.match(/\d+/);
    let localLaw = null;
    if (numbersFound) {
        const sectionNum = numbersFound[0];
        localLaw = ipcData.find(item => 
            String(item.Section || "").trim().toUpperCase() === `IPC_${sectionNum}`
        );
    }

    const systemPrompt = `You are Nyaya-AI, a legal literacy assistant. 
    Format: 1. Summary, 2. Conditions (dashes only), 3. Story Example, 4. Hindi/Marathi, 5. Punishment.
    If context provided, use it. Context: ${localLaw ? localLaw.Description : "None"}`;

    try {
        // ATTEMPT 1: Gemini (Primary)
        const result = await geminiModel.generateContent(`${systemPrompt}\n\nUser: ${query}`);
        const response = await result.response;
        const text = response.text();
        
        myCache.set(query, text);
        return res.json({ answer: text, source: "Gemini-Flash" });

    } catch (geminiError) {
        console.warn("Gemini Rate Limit Hit! Falling back to Hugging Face...");

        try {
            // ATTEMPT 2: Hugging Face (Fallback)
            const hfResponse = await axios.post(HF_ENDPOINT, 
                { inputs: `<s>[INST] ${systemPrompt} \n ${query} [/INST]` },
                { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
            );
            
            const hfText = hfResponse.data[0].generated_text.split("[/INST]")[1] || "Legal analysis complete.";
            myCache.set(query, hfText);
            return res.json({ answer: hfText, source: "HuggingFace-Fallback" });

        } catch (hfError) {
            // ATTEMPT 3: Pure Local Data (Absolute Safety)
            const fallbackText = localLaw 
                ? `Direct Law Found: ${localLaw.Description}\n(AI is currently offline, showing raw database entry.)`
                : "I am having trouble reaching my AI brain. Please try a specific section number like 'IPC 302'.";
            
            return res.json({ answer: fallbackText, source: "Local-Data" });
        }
    }
});

module.exports = router;