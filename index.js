const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ Firebase কানেকশন ============
let db = null;
const hasFirebase = process.env.FIREBASE_PROJECT_ID && 
                    process.env.FIREBASE_PRIVATE_KEY && 
                    process.env.FIREBASE_CLIENT_EMAIL && 
                    process.env.FIREBASE_DATABASE_URL;

if (hasFirebase) {
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
        db = admin.database();
        console.log('✅ Firebase সংযুক্ত');
    } catch (error) {
        console.log('⚠️ Firebase সংযুক্ত হয়নি:', error.message);
    }
} else {
    console.log('ℹ️ Firebase কনফিগার নেই — শুধু লোকাল মেমোরি চলবে');
}

// ============ সিকিউরিটি ============
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// ============ Rate Limit ============
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

// ============ FIFO Queue ============
const gameData = { '1m': { history: [], totalReceived: 0 } };

// ============ Firebase সংরক্ষণ ============
async function saveToFirebase(record) {
    if (!db) return;
    try {
        await db.ref(`dk_results/${record.period}`).set(record);
        const aiRef = db.ref('ai_engine/main');
        const snapshot = await aiRef.once('value');
        let queue = snapshot.val() || [];
        queue.unshift({
            period: record.period,
            numbers: record.numbers,
            timestamp: record.timestamp
        });
        if (queue.length > 100) queue = queue.slice(0, 100);
        await aiRef.set(queue);
        console.log(`🔥 Firebase: ${record.period}`);
    } catch (error) {
        console.log('⚠️ Firebase error:', error.message);
    }
}

// ============ লোকাল ফিফো ============
function addToHistory(gameId, record) {
    const queue = gameData[gameId].history;
    queue.unshift(record);
    gameData[gameId].totalReceived++;
    if (queue.length > 100) queue.pop();
    return queue.length;
}

// ============ API - ডাটা গ্রহণ ============
app.post('/api/live', async (req, res) => {
    try {
        const data = req.body;
        if (!data.period || !data.numbers || data.numbers.length !== 5) {
            return res.status(400).json({ error: 'Invalid data' });
        }

        const record = {
            period: data.period,
            timer: data.timer || '00:00',
            numbers: data.numbers,
            market: 'WinGo 1 Min',
            timestamp: new Date().toISOString()
        };

        addToHistory('1m', record);
        await saveToFirebase(record);

        res.json({ status: 'success', period: record.period });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ সর্বশেষ ডাটা ============
app.get('/api/latest', (req, res) => {
    res.json({
        current: gameData['1m'].history[0] || null,
        history: gameData['1m'].history,
        totalReceived: gameData['1m'].totalReceived
    });
});

// ============ হেলথ চেক ============
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        firebase: db ? 'connected' : 'not configured',
        queueSize: gameData['1m'].history.length
    });
});

app.listen(PORT, () => {
    console.log(`🚀 সার্ভার চলছে পোর্ট ${PORT}`);
});
