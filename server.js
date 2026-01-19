const express = require("express");
const path = require("path");
require("dotenv").config();
const connectDB = require("./db");
const session = require("express-session");
const Final = require("./models/final");

// ===============================
// APP INITIALIZATION
// ===============================
const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "nyayamitra_judge_secret",
    resave: false,
    saveUninitialized: false
  })
);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));

// ===============================
// DATABASE
// ===============================
connectDB();

// ===============================
// HOME
// ===============================
app.get("/", (req, res) => {
  res.render("home");
});

// ===============================
// LAWYER LOGIN
// ===============================
app.get("/lawyer", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const name = req.body.lawyerName;
  if (name && name.trim() !== "") {
    res.redirect(`/lawyer/dashboard/${encodeURIComponent(name.trim())}`);
  } else {
    res.render("login", { error: "Please enter a valid Advocate Name" });
  }
});

const lawyerRoutes = require("./routes/lawyerRoutes");
app.use("/lawyer", lawyerRoutes);

// ===============================
// USER ROUTES (Friend)
// ===============================
const userRoutes = require("./routes/userRoutes");
app.use("/user", userRoutes);

// ===============================
// AI ROUTES (Friend)
// ===============================
const aiRoutes = require("./routes/aiRoutes");
app.use("/ai", aiRoutes);

// ===============================
// JUDGE ROUTES (COMMON)
// ===============================
const judgeRoutes = require("./routes/judgeRoutes");
app.use("/judges", judgeRoutes);

// ===============================
// JUDGE LOGIN (Your Logic)
// ===============================
app.get("/judges/login", (req, res) => {
  res.render("judge-login", { error: null });
});

app.post("/judges/login", async (req, res) => {
  const { judgeName } = req.body;

  if (!judgeName || !judgeName.trim()) {
    return res.render("judge-login", { error: "Judge name required" });
  }

  const judgeExists = await Final.findOne({
    $or: [
      { njdgJudgeName: new RegExp(`^${judgeName}$`, "i") },
      { beforeHonourableJudges: new RegExp(`^${judgeName}$`, "i") }
    ]
  });

  if (!judgeExists) {
    return res.render("judge-login", { error: "Judge not found in database" });
  }

  req.session.judgeName = judgeName.trim();
  res.redirect("/judges");
});

// ===============================
// CAUSE LIST PROXY
// ===============================
app.get("/api/cause-list", async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  try {
    const response = await fetch(
      `https://cause-list-api.onrender.com/api/cause-list?date=${date}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch cause list" });
  }
});

// ===============================
// SAVE NOTES PROXY
// ===============================
app.post("/api/save-note", async (req, res) => {
  const { cnr, note } = req.body;

  if (!cnr || !note) {
    return res.status(400).json({
      message: "CNR and note required"
    });
  }

  try {
    const response = await fetch(
      "https://nyayamitra-notes-ppdm.onrender.com/add_note",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnr, note })
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Save note proxy error:", error);
    res.status(500).json({
      message: "Failed to save note"
    });
  }
});

// ===============================
// FETCH NOTES BY CNR
// ===============================
app.get("/api/get-notes", async (req, res) => {
  const { cnr } = req.query;

  if (!cnr) {
    return res.status(400).json({ message: "CNR is required" });
  }

  try {
    const response = await fetch(
      `https://nyayamitra-notes-ppdm.onrender.com/get_notes?cnr=${cnr}`
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Fetch notes proxy error:", error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
});

// ===============================
// SERVER START
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});