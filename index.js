const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const DK_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json";

let latestData = null;

// ===== LIVE DATA FETCH =====
function fetchLiveData() {
    https.get(DK_URL, (res) => {
        let data = "";

        res.on("data", (chunk) => {
            data += chunk;
        });

        res.on("end", () => {
            try {
                latestData = JSON.parse(data);
                console.log("LIVE DATA UPDATED");
            } catch (err) {
                console.error("JSON Parse Error:", err.message);
            }
        });

    }).on("error", (err) => {
        console.error("Fetch Error:", err.message);
    });
}

// প্রতি 3 সেকেন্ডে একবার আপডেট
setInterval(fetchLiveData, 3000);

// ===== API ENDPOINT =====
app.get("/api/live", (req, res) => {
    if (!latestData) {
        return res.json({ status: false, message: "Loading live data..." });
    }
    res.json(latestData);
});

app.get("/", (req, res) => {
    res.send("DK WIN LIVE SERVER RUNNING OK");
});

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
