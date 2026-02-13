const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// ============ FIFO Queue — ১০০ ডাটা ফিক্সড ============
const gameData = {
    '1m': {
        history: [],
        totalReceived: 0,
        lastUpdate: null
    }
};

// ============ FIFO ফাংশন ============
function addToHistory(gameId, record) {
    const queue = gameData[gameId].history;
    
    // নতুন ডাটা সামনে যোগ করো
    queue.unshift(record);
    gameData[gameId].totalReceived++;
    
    // ১০০ এর বেশি হলে শেষেরটা ডিলিট করো
    if (queue.length > 100) {
        const removed = queue.pop();
        console.log(`🗑️ Removed: ${removed.period} | New: ${record.period} | Queue: ${queue.length}/100`);
    }
    
    console.log(`📊 Total: ${gameData[gameId].totalReceived} | Queue: ${queue.length}/100`);
    return queue.length;
}

// ============ API - লাইভ ডাটা রিসিভ ============
app.post('/api/live', (req, res) => {
    try {
        const data = req.body;
        const gameId = '1m';
        
        const record = {
            period: data.period || 'N/A',
            timer: data.timer || '00:00',
            numbers: data.numbers || [],
            index: gameData[gameId].totalReceived + 1,
            timestamp: new Date().toISOString()
        };
        
        const queueSize = addToHistory(gameId, record);
        
        res.json({
            status: 'success',
            queueSize: queueSize,
            totalReceived: gameData[gameId].totalReceived,
            currentPeriod: record.period,
            numbers: record.numbers
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ API - লেটেস্ট ডাটা ============
app.get('/api/latest', (req, res) => {
    const gameId = '1m';
    res.json({
        current: gameData[gameId]?.history[0] || null,
        history: gameData[gameId]?.history || [],
        queueSize: gameData[gameId]?.history.length || 0,
        totalReceived: gameData[gameId]?.totalReceived || 0,
        serverTime: new Date().toISOString()
    });
});

// ============ API - হেলথ চেক ============
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        queueSize: gameData['1m']?.history.length || 0,
        totalReceived: gameData['1m']?.totalReceived || 0,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 FIFO Server Running on port ${PORT}`);
    console.log(`📊 Max Queue: 100 records`);
    console.log(`🧹 Auto Cleanup: ON`);
});
