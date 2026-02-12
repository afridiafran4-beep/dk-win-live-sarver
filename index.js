
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

let liveData = {
  period: null,
  number: null,
  lastUpdate: null
};

// DK WIN API
const DK_API = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M.json';

async function fetchLive() {
  try {
    const res = await fetch(DK_API);
    const json = await res.json();

    if (json && json.data && json.data.length > 0) {
      const d = json.data[0];

      liveData.period = d.issueNumber || d.issue || null;
      liveData.number = d.number || null;
      liveData.lastUpdate = new Date().toLocaleString();

      console.log('LIVE:', liveData);
    }
  } catch (err) {
    console.log('Fetch error:', err.message);
  }
}

// প্রতি 2 সেকেন্ডে ফেচ করবে
setInterval(fetchLive, 2000);

// API Endpoint
app.get('/api/live', (req, res) => {
  res.json({
    status: 'ok',
    source: 'DK WIN',
    data: liveData
  });
});

app.get('/', (req, res) => {
  res.send('DK WIN LIVE SERVER RUNNING');
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
