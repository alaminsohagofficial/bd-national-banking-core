const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const LCApplication = require('./models/LCModel');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sonali_bank_cbs')
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('Database connection error:', err));

// Gemini AI API Integration
async function parseWithGemini(userPrompt) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    try {
        const response = await axios.post(endpoint, {
            contents: [{
                parts: [{ text: `Extract JSON format with keys (lcType, vehicleModel, color, engine, amount) from this text: "${userPrompt}"` }]
            }]
        });
        
        const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        // Clean markdown code blocks if returned by Gemini
        const cleanedJSON = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJSON);
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        return { error: "Gemini API processing failed", fallbackModel: "2024 Toyota Land Cruiser LC300" };
    }
}

// Vehicle LC API Endpoint
app.post('/api/vehicle-lc', async (req, res) => {
    try {
        const { userPrompt, vehicleInfo } = req.body;

        const aiParsedData = await parseWithGemini(userPrompt || "Process LC for Land Cruiser");

        const lcPayload = vehicleInfo || {
            model: "2024 Toyota Land Cruiser LC300",
            color: "Precious White Pearl",
            engine: "3.5L V6 Twin-Turbo Petrol",
            lcMargin: "15%",
            beneficiary: "Toyota Motor Corporation, Japan"
        };

        const generatedLcNumber = 'LC-' + Math.floor(100000 + Math.random() * 900000);

        // Save to Database
        const newLC = new LCApplication({
            lcNumber: generatedLcNumber,
            vehicleModel: lcPayload.model,
            color: lcPayload.color,
            engine: lcPayload.engine,
            lcMargin: lcPayload.lcMargin,
            beneficiary: lcPayload.beneficiary
        });

        await newLC.save();

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            geminiAnalysis: aiParsedData,
            coreBankingLCResponse: {
                status: 'SUCCESS',
                lcNumber: generatedLcNumber,
                vehicleDetails: `${lcPayload.model} (${lcPayload.color})`,
                message: 'Letter of Credit (LC) opened successfully and saved to Sonali Bank CBS database'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get All LC Records API
app.get('/api/lc-list', async (req, res) => {
    try {
        const lcList = await LCApplication.find().sort({ createdAt: -1 });
        res.json({ success: true, data: lcList });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sonali Bank Vehicle LC CBS Gateway running on port ${PORT}`);
});
