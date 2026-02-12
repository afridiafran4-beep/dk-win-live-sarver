// ============================================
// DK Win Live Server - Render.com Ready
// No Firebase - Only Console Log + API Ready
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ সিকিউরিটি মিডলওয়্যার ============
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// ============ Rate Limiting (CRASH বন্ধ করবে) ============
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 মিনিট
    max: 20, // সর্বোচ্চ ২০টি রিকোয়েস্ট প্রতি মিনিটে
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ============ মেমোরি ম্যানেজমেন্ট ============
const memoryUsage = () => {
    const used = process.memoryUsage();
    console.log(`🧠 Memory: ${Math.round(used.rss / 1024 / 1024)}MB`);
};

// প্রতি ৫ মিনিট পর মেমোরি দেখাও
setInterval(memoryUsage, 5 * 60 * 1000);

// ============ ইন-মেমোরি ডাটা স্টোর ============
let latestData = {
    period: '',
    timer: '',
    numbers: [],
    market: '',
    timestamp: '',
    source: '',
    lastUpdate: null
};

let dataHistory = [];

// ============ হেলথ চেক ============
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// ============ লাইভ ডাটা রিসিভ API ============
app.post('/api/live', (req, res) => {
    try {
        // রিকোয়েস্ট ভ্যালিডেশন
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'Empty request body' });
        }

        const data = req.body;
        
        // ডাটা আপডেট
        latestData = {
            period: data.period || '',
            timer: data.timer || '',
            numbers: data.numbers || [],
            market: data.market || 'WinGo 1 Min',
            timestamp: data.timestamp || new Date().toISOString(),
            source: data.source || 'unknown',
            lastUpdate: new Date().toISOString()
        };

        // হিস্ট্রিতে যোগ করুন (সর্বোচ্চ ১০০)
        dataHistory.unshift({
            ...latestData,
            receivedAt: new Date().toISOString()
        });
        
        if (dataHistory.length > 100) {
            dataHistory = dataHistory.slice(0, 100);
        }

        // ============ CONSOLE আউটপুট ============
        console.log('\n' + '='.repeat(50));
        console.log(`📡 DK WIN LIVE DATA RECEIVED`);
        console.log('='.repeat(50));
        console.log(`🆔 Period     : ${latestData.period}`);
        console.log(`⏱️  Timer     : ${latestData.timer}`);
        console.log(`🔢 Numbers    : ${latestData.numbers.join(' - ')}`);
        console.log(`🎮 Market     : ${latestData.market}`);
        console.log(`📅 Time       : ${new Date().toLocaleTimeString()}`);
        console.log('='.repeat(50) + '\n');

        // সাকসেস রেসপন্স
        res.json({
            status: 'success',
            received: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============ লেটেস্ট ডাটা দেখার API ============
app.get('/api/latest', (req, res) => {
    res.json({
        current: latestData,
        historyCount: dataHistory.length,
        serverTime: new Date().toISOString()
    });
});

// ============ হিস্ট্রি দেখার API ============
app.get('/api/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    res.json({
        history: dataHistory.slice(0, limit),
        total: dataHistory.length
    });
});

// ============ 404 হ্যান্ডলার ============
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ============ Error হ্যান্ডলার ============
app.use((err, req, res, next) => {
    console.error('🔥 Unhandled Error:', err);
    res.status(500).json({
        error: 'Something broke!',
        message: err.message
    });
});

// ============ সার্ভার স্টার্ট ============
app.listen(PORT, () => {
    console.log('\n' + '🚀'.repeat(15));
    console.log(`✅ DK Win Live Server Running`);
    console.log(`📍 Port      : ${PORT}`);
    console.log(`📍 Health    : http://localhost:${PORT}/health`);
    console.log(`📍 API       : http://localhost:${PORT}/api/live`);
    console.log(`📍 Latest    : http://localhost:${PORT}/api/latest`);
    console.log('🚀'.repeat(15) + '\n');
    
    memoryUsage();
});
