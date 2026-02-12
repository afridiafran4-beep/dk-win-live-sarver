import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

// ========================
// SETUP
// ========================
app.use(cors());
app.use(express.json());

// ========================
// CONFIGURATION
// ========================
const dkWinURL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json?ts=1770883980736"; // DK WIN JSON URL
let latestData = { numbers: null, period: null }; // লাইভ নাম্বার স্টোর করার জন্য

// ========================
// FETCH LIVE NUMBERS
// ========================
async function fetchLiveNumbers() {
    try {
        const res = await fetch(dkWinURL, { cache: "no-store" });
        const data = await res.json();

        // Example: JSON keys
        const numbers = data.currentNumbers || data.numbers; // যদি currentNumbers না থাকে, data.numbers দেখ
        const period = data.currentPeriod || data.period;

        latestData = { numbers, period };
        console.log("Updated live numbers:", latestData);
    } catch (err) {
        console.error("Failed to fetch DK WIN numbers:", err);
    }
}

// প্রতি 10 সেকেন্ডে ফেচ
setInterval(fetchLiveNumbers, 10000);
fetchLiveNumbers(); // server start সাথে সাথে fetch

// ========================
// API ENDPOINT
// ========================
app.get("/api/live", (req, res) => {
    res.json(latestData);
});

// ========================
// SERVER START
// ========================
app.listen(port, () => {
    console.log(`DK WIN Live Server running at http://localhost:${port}`);
});
