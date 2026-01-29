const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GLM_API_KEY;
const API_URL = "https://api.z.ai/api/paas/v4/chat/completions";

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only use FREE models as per Z.AI pricing documentation
const MODELS = [
    "glm-4.7-flash",
    "glm-4.6v-flash",
    "glm-4.5-flash"
];

const SYSTEM_PROMPT = `You are a synthetic data generator for Urdu.
Your task is to generate high-quality synthetic data in Urdu.
Output Format: JSON only. Do not wrap in markdown or code blocks.
Structure:
{
  "question": "A question in Urdu",
  "reasons": ["Reason 1 in Urdu", "Reason 2 in Urdu", "Reason 3 in Urdu"],
  "selected_reason": "The best reason from the list above",
  "why_selected": "Explanation of why this reason was selected in Urdu",
  "answer": "The final answer based on the selected reason in Urdu"
}`;

// Background Worker State
let isGenerating = false;
let stopRequested = false;

async function generateData() {
    const userPrompt = "Generate a complex reasoning question in Urdu about history, science, or general knowledge.";

    for (const model of MODELS) {
        try {
            console.log(`[Worker] Trying model: ${model}...`);
            const response = await axios.post(API_URL, {
                model: model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            }, {
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            let content = response.data.choices[0].message.content;
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(content);
            parsedData.model = model;

            // Save to Supabase
            const { error } = await supabase
                .from('synthetic_data')
                .insert([parsedData]);

            if (error) {
                console.error("[Worker] Supabase Insert Error:", error.message);
                throw error;
            }

            console.log(`[Worker] Success! Sample saved to Supabase using ${model}.`);
            return parsedData;

        } catch (error) {
            const msg = error.response?.data?.error?.message || error.message;
            console.error(`[Worker] Model ${model} failed: ${msg}`);
        }
    }
    throw new Error("All models failed");
}

async function backgroundWorker() {
    if (isGenerating) return;
    isGenerating = true;
    stopRequested = false;
    console.log("[Worker] Background generation started.");

    while (!stopRequested) {
        try {
            await generateData();
            // Wait 10 seconds between generations
            await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (err) {
            console.error("[Worker] Loop Error:", err.message);
            // Wait 30 seconds on error
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    isGenerating = false;
    console.log("[Worker] Background generation stopped.");
}

app.get('/api/status', (req, res) => {
    res.json({ isGenerating });
});

app.post('/api/start', (req, res) => {
    if (isGenerating) return res.json({ message: "Already running" });
    backgroundWorker();
    res.json({ message: "Started" });
});

app.post('/api/stop', (req, res) => {
    stopRequested = true;
    res.json({ message: "Stop requested" });
});

app.get('/api/dataset', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('synthetic_data')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error("[Dataset] Supabase error:", error.message);
            return res.json([]);
        }
        res.json(data || []);
    } catch (err) {
        console.error("[Dataset] Server error:", err.message);
        res.json([]);
    }
});

// Export for Vercel
module.exports = app;

// Only listen if run directly (local development)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\nServer is running at http://localhost:${PORT}`);
        console.log(`Supabase Connected: ${supabaseUrl}`);
    });
}

