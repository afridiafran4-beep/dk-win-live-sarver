const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// =====================
// ROUTE - GET /
// =====================
app.get("/", (req, res) => {
  res.send("DK WIN Live Number Fetcher Server is running!");
});

// =====================
// ROUTE - POST /api/live
// =====================
app.post("/api/live", (req, res) => {
  const { numbers, period } = req.body;

  console.log("Received live data:");
  console.log("Numbers:", numbers);
  console.log("Period:", period);

  // এখানে তুমি চাইলে ডাটাবেস/ফাইল বা অন্য সার্ভারে পাঠাতে পারবে
  // কিন্তু এখন কেবল লগে দেখাবে

  res.json({ status: "success", received: { numbers, period } });
});

// =====================
// OPTIONAL - Fetch DK WIN JSON periodically
// =====================
const DK_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json?ts=1770883980736";
const FETCH_INTERVAL = 60000; // 60 সেকেন্ডে একবার

async function fetchAndLog() {
  try {
    const response = await fetch(DK_URL, { cache: "no-store" });
    const data = await response.json();

    // উদাহরণ: JSON থেকে লাইভ নাম্বার ও পিরিয়ড
    const numbers = data.currentNumbers;
    const period = data.currentPeriod;

    console.log("Fetched from DK WIN:", numbers, period);

    // Render সার্ভারে পাঠাতে চাইলে এখানে POST করা যাবে
    await fetch(`https://dk-win-live-sarver.onrender.com/api/live`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numbers, period })
    });
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    setTimeout(fetchAndLog, FETCH_INTERVAL);
  }
}

// Uncomment করলে DK WIN থেকে স্বয়ংক্রিয়ভাবে নাম্বার POST করবে
// fetchAndLog();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
