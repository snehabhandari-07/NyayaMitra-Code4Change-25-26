const express = require("express");
const router = express.Router();
const Case = require("../models/case");
const Final = require("../models/final");

/**
 * =========================
 * JUDGE LOGIN PAGE
 * =========================
 */
router.get("/login", (req, res) => {
  res.render("judge-login");
});

/**
 * =========================
 * JUDGE LOGIN SUBMIT
 * =========================
 */
router.post("/login", async (req, res) => {
  try {
    const judgeName = req.body.judgeName.trim();

    if (!judgeName) {
      return res.render("judge-login", { error: "Judge name is required" });
    }

   const judgeExists = await Final.findOne({
  beforeHonourableJudges: { $regex: judgeName, $options: "i" }
});


    if (!judgeExists) {
      return res.render("judge-login", { error: "Invalid Judge Name" });
    }

    req.session.judgeName = judgeExists.beforeHonourableJudges;
    res.redirect("/judges");

  } catch (err) {
    console.error(err);
    res.status(500).send("Login failed");
  }
});


/**
 * =========================
 * JUDGE DASHBOARD
 * =========================
 */
router.get("/", ensureJudgeLogin, async (req, res) => {
  try {
    const cnr = req.query.cnr;

    const query = cnr
      ? { cnrNumber: new RegExp(cnr, "i") }
      : {};

    const cases = await Case.find(query).limit(50);

    const riskSummary = {
      high: cases.filter(c => c.currentStatus === "Pending" && c.year < 2018).length,
      medium: cases.filter(c => c.currentStatus === "Pending" && c.year >= 2018).length,
      low: cases.filter(c => c.currentStatus === "Disposed").length
    };

    const alerts = [
      { message: "Case KAHC012345 needs urgent review" },
      { message: "Pending ADR referral for Case KAHC067890" },
      { message: "High-priority hearing tomorrow at 10:00 AM" }
    ];

    res.render("judge", {
      judgeName: req.session.judgeName,
      cases,
      stats: riskSummary,
      riskSummary,
      alerts
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

/**
 * =========================
 * SEND MESSAGE
 * =========================
 */
router.post("/message/:id", async (req, res) => {
  try {
    await Case.findByIdAndUpdate(req.params.id, {
      $push: { communications: req.body.message }
    });

    res.redirect("/judges");
  } catch (err) {
    console.error(err);
    res.status(500).send("Message failed");
  }
});

/**
 * =========================
 * ANALYTICS DATA
 * =========================
 */
router.get("/analytics-data", ensureJudgeLogin, async (req, res) => {
  try {
    const judgeName = req.session.judgeName;

const cases = await Final.find({
  beforeHonourableJudges: judgeName
});

    const pending = cases.filter(c => c.currentStatus === "Pending").length;
    const disposed = cases.filter(c => c.currentStatus === "Disposed").length;
    const total = cases.length;

    res.json({ pending, disposed, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * LIVE DASHBOARD COUNTS
 * =========================
 */
router.get("/dashboard-counts", ensureJudgeLogin, async (req, res) => {
  try {
    const judgeName = req.session.judgeName;

const totalCases = await Final.countDocuments({
  beforeHonourableJudges: judgeName
});

const pendingCases = await Final.countDocuments({
  beforeHonourableJudges: judgeName,
  newCaseStatus: /Pending/i
});

const disposedCases = await Final.countDocuments({
  beforeHonourableJudges: judgeName,
  newCaseStatus: /Disposed/i
});


    res.json({
      total: totalCases,
      pending: pendingCases,
      disposed: disposedCases
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * PRIORITY DATA
 * =========================
 */
router.get("/priority-data", ensureJudgeLogin, async (req, res) => {
  try {
   const judgeName = req.session.judgeName;

const high = await Final.countDocuments({
  beforeHonourableJudges: judgeName,
  newCaseStatus: /Pending/i,
  caseAge: { $exists: true, $ne: "" }
});

const medium = await Final.countDocuments({
  beforeHonourableJudges: judgeName,
  newCaseStatus: /Pending/i
});

const low = await Final.countDocuments({
  beforeHonourableJudges: judgeName,
  newCaseStatus: /Disposed/i
});

    res.json({ high, medium, low });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * LOGOUT
 * =========================
 */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/judges/login");
  });
});

/**
 * =======================
 * JUDGE AUTH MIDDLEWARE
 * =======================
 */
function ensureJudgeLogin(req, res, next) {
  if (!req.session || !req.session.judgeName) {
    return res.redirect("/judges/login");
  }
  res.locals.judgeName = req.session.judgeName;
  next();
}

/**
 * =========================
 * TOTAL CASES PAGE
 * =========================
 */
router.get("/total-cases", ensureJudgeLogin, async (req, res) => {
  try {
    const judgeName = req.session.judgeName;

    const cases = await Final.find({
      beforeHonourableJudges: judgeName
    }).sort({ dateFiled: -1 });

    res.render("judge-total-cases", {
      judgeName,
      cases
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load total cases");
  }
});


/**
 * =========================
 * PENDING CASES PAGE
 * =========================
 */
router.get("/pending-cases", ensureJudgeLogin, async (req, res) => {
  try {
    const judgeName = req.session.judgeName;

    const cases = await Final.find({
      beforeHonourableJudges: judgeName,
      newCaseStatus: /Pending/i
    }).sort({ dateFiled: -1 });

    res.render("judge-pending-cases", {
      judgeName,
      cases
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load pending cases");
  }
});


/**
 * =========================
 * DISPOSED CASES PAGE
 * =========================
 */
router.get("/disposed-cases", ensureJudgeLogin, async (req, res) => {
  try {
    const judgeName = req.session.judgeName;

    const cases = await Final.find({
      beforeHonourableJudges: judgeName,
      newCaseStatus: /Disposed/i
    }).sort({ decisionDate: -1 });

    res.render("judge-disposed-cases", {
      judgeName,
      cases
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load disposed cases");
  }
});


/**
 * =========================
 * ANALYTICS DATA (LIVE)
 * =========================
 */
router.get("/analytics-live", ensureJudgeLogin, async (req, res) => {
  try {
    const judgeName = req.session.judgeName;

    const cases = await Final.find({
      beforeHonourableJudges: judgeName
    });

    /* ---- Year-wise Disposal Rate ---- */
    const yearMap = {};

    cases.forEach(c => {
      if (c.decisionYear) {
        yearMap[c.decisionYear] =
          (yearMap[c.decisionYear] || 0) + 1;
      }
    });

    const years = Object.keys(yearMap).sort();
    const disposedCounts = years.map(y => yearMap[y]);

    /* ---- Case Type Distribution ---- */
    const typeMap = {};

    cases.forEach(c => {
      if (c.caseType) {
        typeMap[c.caseType] =
          (typeMap[c.caseType] || 0) + 1;
      }
    });

    res.json({
      disposal: {
        years,
        counts: disposedCounts
      },
      caseTypes: typeMap
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Analytics fetch failed" });
  }
});


router.get("/notice", (req, res) => {
  res.render("judge/notice", {
    judgeName: req.session.judgeName,
    cnr: req.query.cnr
  });
});

router.get("/penalty", (req, res) => {
  res.render("judge/penalty", {
    judgeName: req.session.judgeName,
    cnr: req.query.cnr
  });
});

router.get("/service-status", (req, res) => {
  res.render("judge/service-status", {
    judgeName: req.session.judgeName,
    cnr: req.query.cnr
  });
});

router.get("/schedule", (req, res) => {
  res.render("judge/schedule", {
    judgeName: req.session.judgeName,
    cnr: req.query.cnr
  });
});


/**
 * SMART SCHEDULING (AI)
 */
router.post("/smart-schedule", async (req, res) => {
  const { cnr_number, selectedDate } = req.body;

  if (!cnr_number) {
    return res.status(400).json({ error: "CNR number is required" });
  }

  try {
    // Call external API
    const response = await fetch(
      "https://nyayamitra-smart-scheduling.onrender.com/smart-schedule",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ cnr_number })
      }
    );

    const data = await response.json();

    // Calculate next hearing date if selectedDate is given
    if (selectedDate && data.suggested_next_hearing_days != null) {
      const nextDate = new Date(selectedDate);
      nextDate.setDate(
        nextDate.getDate() + data.suggested_next_hearing_days
      );
      data.nextHearingDate = nextDate.toDateString();
    }

    res.json(data);

  } catch (err) {
    console.error("Smart Scheduling Error:", err);
    res.status(500).json({ error: "Smart scheduling service failed" });
  }
});


module.exports = router;