const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ Firebase কানেকশন ============
// Environment Variables থেকে Firebase কনফিগারেশন নেওয়া হবে
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// ============ সিকিউরিটি মিডলওয়্যার ============
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// ============ Rate Limit (প্রতি মিনিটে ২০টি রিকোয়েস্ট) ============
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

// ============ FIFO Queue — সার্ভারে সর্বোচ্চ ১০০ ডাটা রাখবে ============
const gameData = {
    '1m': {
        history: [],
        totalReceived: 0
    }
};

// ============ Firebase এ ডাটা পাঠানোর ফাংশন ============
async function saveToFirebase(record) {
    try {
        // ১. `dk_results` এ সব ডাটা জমা (পিরিয়ড আইডি হিসেবে)
        await db.ref(`dk_results/${record.period}`).set({
            period: record.period,
            numbers: record.numbers,
            timer: record.timer,
            market: record.market,
            timestamp: record.timestamp
        });

        // ২. `ai_engine/main` এ সর্বোচ্চ ১০০ ডাটা রাখবে (FIFO)
        const aiRef = db.ref('ai_engine/main');
        const snapshot = await aiRef.once('value');
        let queue = snapshot.val() || [];
        
        queue.unshift({
            period: record.period,
            numbers: record.numbers,
            timestamp: record.timestamp
        });
        
        if (queue.length > 100) {
            queue = queue.slice(0, 100);
        }
        await aiRef.set(queue);

        console.log(`🔥 Firebase সংরক্ষিত — Period: ${record.period}`);
        return true;
    } catch (error) {
        console.error('❌ Firebase Error:', error.message);
        return false;
    }
}

// ============ FIFO ফাংশন (সার্ভারের নিজস্ব মেমোরি) ============
function addToHistory(gameId, record) {
    const queue = gameData[gameId].history;
    queue.unshift(record);
    gameData[gameId].totalReceived++;
    if (queue.length > 100) {
        const removed = queue.pop();
        console.log(`🗑️ পুরোনো ডিলিট: ${removed.period} | নতুন: ${record.period} | Queue: ${queue.length}/100`);
    }
    console.log(`📊 মোট রিসিভ: ${gameData[gameId].totalReceived} | বর্তমান: ${queue.length}/100`);
    return queue.length;
}

// ============ API - লাইভ ডাটা রিসিভ ============
app.post('/api/live', async (req, res) => {
    try {
        const data = req.body;

        // ডাটা ভ্যালিডেশন
        if (!data.period || !data.numbers || data.numbers.length !== 5) {
            return res.status(400).json({ error: 'Invalid data' });
        }

        const record = {
            period: data.period,
            timer: data.timer || '00:00',
            numbers: data.numbers,
            market: data.market || 'WinGo 1 Min',
            timestamp: data.timestamp || new Date().toISOString()
        };

        // ১. লোকাল FIFO queue তে যোগ
        const queueSize = addToHistory('1m', record);

        // ২. Firebase এ সংরক্ষণ
        await saveToFirebase(record);

        res.json({
            status: 'success',
            queueSize: queueSize,
            totalReceived: gameData['1m'].totalReceived,
            period: record.period
        });

    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ API - লেটেস্ট ডাটা দেখার জন্য ============
app.get('/api/latest', (req, res) => {
    res.json({
        current: gameData['1m']?.history[0] || null,
        history: gameData['1m']?.history || [],
        queueSize: gameData['1m']?.history.length || 0,
        totalReceived: gameData['1m']?.totalReceived || 0,
        serverTime: new Date().toISOString()
    });
});

// ============ API - স্বাস্থ্য পরীক্ষা ============
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        firebase: process.env.FIREBASE_PROJECT_ID ? 'connected' : 'not configured',
        project: process.env.FIREBASE_PROJECT_ID || 'unknown',
        queueSize: gameData['1m']?.history.length || 0,
        totalReceived: gameData['1m']?.totalReceived || 0,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// ============ সার্ভার চালু ============
app.listen(PORT, () => {
    console.log(`🚀 সার্ভার চালু হয়েছে পোর্ট ${PORT}`);
    console.log(`📊 FIFO Queue: সর্বোচ্চ ১০০ ডাটা`);
    console.log(`🔥 Firebase: ${process.env.FIREBASE_PROJECT_ID ? 'সংযুক্ত' : 'সংযুক্ত হয়নি'}`);
    console.log(`🧹 অটো ক্লিনআপ: চালু`);
});
