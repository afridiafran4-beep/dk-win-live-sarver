const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

let liveData = {
  period: "0000",
  number: "0"
};

app.get('/', (req, res) => {
  res.send('DK WIN Live Server Running');
});

app.get('/api/live', (req, res) => {
  res.json(liveData);
});

app.post('/api/live', (req, res) => {
  const { period, number } = req.body;

  if (!period || !number) {
    return res.status(400).json({ error: 'period & number required' });
  }

  liveData = { period, number };
  res.json({ success: true, liveData });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
