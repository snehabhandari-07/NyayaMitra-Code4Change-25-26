const express = require("express");
const router = express.Router();
const Final = require("../models/final"); // The Master Model
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const upload = multer({ storage: multer.memoryStorage() }); // Store file in memory briefly
const path = require("path");

router.get("/my-appearance-dates", async (req, res) => {
    try {
        const { lawyerName } = req.query;
        // Find all unique dates in your MongoDB for this lawyer
        const dates = await Final.distinct("hearingHistory.hearingDate", {
            $or: [
                { petitionerAdvocate: new RegExp(lawyerName, "i") },
                { respondentAdvocate: new RegExp(lawyerName, "i") }
            ]
        });
        res.json(dates.slice(0, 5)); // Send the most recent 5 dates
    } catch (err) {
        res.json([]);
    }
});

router.get("/fetch-cause-list", async (req, res) => {
    try {
        const { date, lawyerName } = req.query;
        if (!date) return res.status(400).json({ error: "Date is required" });

        const response = await axios.get(`https://cause-list-api.onrender.com/api/cause-list`, {
            params: { date: date },
            timeout: 8000 
        });

        let data = response.data;

        // If the API returns the JSON structure you provided
        if (data && data.cases && Array.isArray(data.cases)) {
            const normalizedLawyer = lawyerName ? lawyerName.toLowerCase().trim() : "";
            
            // Priority Sort: Move cases where the lawyer's name appears in the 'bench' to the top
            data.cases.sort((a, b) => {
                const aMatch = a.bench.toLowerCase().includes(normalizedLawyer);
                const bMatch = b.bench.toLowerCase().includes(normalizedLawyer);
                return (aMatch === bMatch) ? 0 : aMatch ? -1 : 1;
            });
        }

        res.json(data);
    } catch (err) {
        console.error("Cause List Error:", err.message);
        res.status(500).json({ error: "API unreachable" });
    }
});

// routes/lawyerRoutes.js
const bnsMapping = {
  127: {
    bns: "155",
    title: "Receiving property taken by war or depredation",
    change:
      "Modernized language; integrated with new chapters on State property.",
  },
  302: {
    bns: "101",
    title: "Murder",
    change: "Punishment remains similar; organized crime context added.",
  },
  420: {
    bns: "318(4)",
    title: "Cheating",
    change: "Enhanced focus on digital/cyber cheating.",
  },
  376: {
    bns: "64",
    title: "Rape",
    change: "Stricter minimum sentences and community service options.",
  },
  307: {
    bns: "109",
    title: "Attempt to Murder",
    change: "Procedural changes in filing FIR.",
  },
  323: {
    bns: "115",
    title: "Voluntarily Causing Hurt",
    change: "Merged with community service provisions.",
  },
  506: {
    bns: "351",
    title: "Criminal Intimidation",
    change: "Higher fines for digital intimidation.",
  },
  "120B": {
    bns: "61",
    title: "Criminal Conspiracy",
    change: "Now a standalone chapter for organized crime.",
  },
  "304A": {
    bns: "106",
    title: "Death by Negligence",
    change: "Specifically addresses hit-and-run incidents.",
  },
  379: {
    bns: "303",
    title: "Theft",
    change: "Snatching is now a separate, more serious offence.",
  },
  "498A": {
    bns: "85",
    title: "Cruelty by Husband/Relatives",
    change: "Definitions aligned with modern marital laws.",
  },
};

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

router.post("/legal-intelligence", async (req, res) => {
  const { cnrNumber, ipcSection, mode = "strategy" } = req.body;

  try {
    let prompt = "";

    // ---------- MODE 1: IPC ➜ BNS MAPPER ----------
    if (mode === "mapper" && ipcSection) {
      const cleanSection = ipcSection.replace(/\D/g, "");

      // Static fast path
      if (bnsMapping?.[cleanSection]) {
        const d = bnsMapping[cleanSection];
        return res.json({
          type: "static",
          result: `IPC ${cleanSection} ➜ BNS ${d.bns}\nOffence: ${d.title}\nKey Change: ${d.change}`,
        });
      }

      prompt = `What is the corresponding Bharatiya Nyaya Sanhita (BNS) section for IPC Section ${ipcSection}? Answer in one sentence.`;
    }

    // ---------- MODE 2: LEGAL STRATEGY ----------
    else {
      const caseData = await Final.findOne({ cnrNumber });
      if (!caseData) {
        return res.status(404).json({ error: "CNR not found" });
      }

      prompt = `You are a Senior Indian Advocate. Provide a concise 3-step legal strategy for a case under ${caseData.underSections}. Current stage: ${caseData.caseStages}. Side: Petitioner.`;
    }

    const messages = [
      {
        role: "system",
        content: "You are a professional Indian legal expert.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    let completion;

    try {
      completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.2,
        max_tokens: 200,
      });
    } catch (err) {
      console.error("Primary Groq model failed:", err.message);

      completion = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages,
        temperature: 0.2,
        max_tokens: 200,
      });
    }

    const output = completion.choices[0].message.content;
    const cleanOutput = output.replace(/\*/g, "");

    return res.json({
      type: "ai",
      result: cleanOutput,
    });
  } catch (err) {
    console.error("Groq Error:", err.message);

    // ---------- GUARANTEED FALLBACK ----------
    return res.json({
      type: "fallback",
      result:
        "STRATEGY BRIEF:\n1. Verify FIR and jurisdiction validity.\n2. Examine BNSS procedural compliance.\n3. Prepare interim relief focusing on urgency and admissibility of evidence.",
    });
  }
});

router.post("/summarize-case", upload.single("file"), async (req, res) => {
  console.log("--- New Upload Request ---");

  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      "https://pratm-ai-case-summary-api.hf.space/summarize",
      formData,
      { headers: { ...formData.getHeaders() } }
    );

    res.json(response.data);
  } catch (error) {
    // Handle the "Document too small" error gracefully
    if (error.response && error.response.data && error.response.data.error) {
      console.log("AI Model rejected content:", error.response.data.error);

      // Send a friendly message instead of a crash
      return res.json({
        summary:
          "NOTICE: This specific document contains insufficient text for a deep AI summary. Please ensure the PDF is not a low-quality scan and contains at least 200 words of legal content.",
      });
    }

    console.error("Summarization Error:", error.message);
    res.status(500).json({ error: "AI Service is currently warming up." });
  }
});

// 1. DASHBOARD ROUTE (Updated logic)
router.get("/dashboard/:lawyerName", async (req, res) => {
  const { lawyerName } = req.params;
  const searchQuery = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  try {
    let matchStage = {
      $or: [
        { petitionerAdvocate: lawyerName },
        { respondentAdvocate: lawyerName },
      ],
    };

    if (searchQuery) {
      matchStage.cnrNumber = new RegExp(searchQuery, "i");
    }

    const portfolio = await Final.aggregate([
      { $match: matchStage },
      { $sort: { hearingDate: -1 } }, // Sort to get the most recent data
      {
        $group: {
          _id: "$cnrNumber",
          // Keep the most recent record's full data
          caseDetails: { $first: "$$ROOT" },
          // UPDATED LOGIC: Find the furthest future date across all hearings for this CNR
          maxNextHearing: { $max: "$nextHearingDate" },
          allHearings: { $push: "$$ROOT" },
        },
      },
      {
        // Inject the true max date back into the caseDetails object
        $addFields: {
          "caseDetails.nextHearingDate": "$maxNextHearing",
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalCases = await Final.distinct("cnrNumber", matchStage);

    res.render("lawyer", {
      cases: portfolio.map((p) => p.caseDetails),
      lawyerName,
      searchQuery,
      stats: {
        total: totalCases.length,
        // Count active based on the existence of the newly calculated nextHearingDate
        active: portfolio.filter((p) => p.caseDetails.nextHearingDate).length,
        disposed: portfolio.filter((p) => p.caseDetails.natureOfDisposal)
          .length,
      },
      currentPage: page,
      totalPages: Math.ceil(totalCases.length / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard Load Error");
  }
});

// 2. CASE DETAILS ROUTE (Fixed Summary Fetch)
router.get("/case-details/:cnr", async (req, res) => {
  const history = await Final.find({ cnrNumber: req.params.cnr })
    .sort({ hearingDate: 1 })
    .lean();

  if (history.length === 0)
    return res.status(404).json({ error: "Case not found" });

  // Calculate metrics that are "missing" from the raw data
  const totalHearings = history.length; //
  const lastStage = history[history.length - 1].caseStages || "Pending"; //
  const isDisposed = history.some((h) => h.natureOfDisposal); //

  res.json({
    ...history[0],
    totalHearings,
    lastStage,
    caseState: isDisposed ? "Disposed" : "Pending",
    hearingHistory: history,
  });
});

// 3. SECURE NOTES ROUTE (Changed Insight -> Final)
// --- 5. CREATE or UPDATE (Upsert Case) ---
// This allows lawyers to manually register new cases into the 'Final' collection
// routes/lawyerRoutes.js

router.post("/upsert-case/:lawyerName", async (req, res) => {
    try {
        const { lawyerName } = req.params;
        const caseData = req.body;

        const cleanCNR = caseData.cnrNumber.trim().toUpperCase();

        // FIX: Convert arrays to comma-separated strings to match your String schema
        const sectionsString = Array.isArray(caseData.underSections) 
            ? caseData.underSections.join(", ") 
            : caseData.underSections;

        const actsString = Array.isArray(caseData.underActs) 
            ? caseData.underActs.join(", ") 
            : caseData.underActs;

        const updatedCase = await Final.findOneAndUpdate(
            { cnrNumber: cleanCNR },
            {
                $set: {
                    cnrNumber: cleanCNR,
                    caseNumber: caseData.caseNumber,
                    clientNames: caseData.clientNames,
                    courtName: caseData.courtName,
                    courtSate: caseData.courtSate,
                    caseStages: caseData.newCaseStatus,
                    underActs: actsString,     // Saved as String
                    underSections: sectionsString, // Saved as String
                    nextHearingDate: caseData.nextHearingDate,
                    caseAge: parseInt(caseData.caseAge) || 0,
                    petitionerAdvocate: lawyerName,
                    lastUpdated: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: updatedCase });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 6. DELETE CASE ---
// Removes all hearing entries associated with a CNR from the lawyer's portfolio
router.delete("/delete-case/:cnr", async (req, res) => {
  try {
    const { cnr } = req.params;

    // We use deleteMany because a single CNR has multiple hearing rows in the 100k dataset
    const result = await Final.deleteMany({ cnrNumber: cnr });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Case not found" });
    }

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} records.`,
    });
  } catch (err) {
    console.error("Deletion Error:", err);
    res.status(500).json({ success: false });
  }
});

// --- 7. TOGGLE TASK COMPLETION ---
// Specifically for the reminders feature in your Dashboard
router.post("/toggle-reminder", async (req, res) => {
  try {
    const { cnrNumber, reminderId, completed } = req.body;

    await Final.updateMany(
      { cnrNumber, "reminders._id": reminderId },
      { $set: { "reminders.$.completed": completed } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// --- 1. SECURE NOTES (PERSISTENT) ---
router.post("/update-note", async (req, res) => {
  try {
    const { cnrNumber, note } = req.body;

    // Broadcast the update to EVERY hearing record associated with this CNR
    const result = await Final.updateMany(
      { cnrNumber: cnrNumber },
      { $set: { privateNotes: note } }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "CNR not found in database." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Backend Note Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 2. ADD REMINDER (PERSISTENT) ---
router.post("/add-reminder", async (req, res) => {
  try {
    const { cnrNumber, text, date } = req.body;

    const newTask = {
      text,
      dateTime: new Date(date),
      completed: false,
    };

    // Push task to EVERY row with this CNR
    await Final.updateMany(
      { cnrNumber: cnrNumber },
      { $push: { reminders: newTask } }
    );

    // Fetch the updated list to send back to UI
    const updatedDoc = await Final.findOne({ cnrNumber }).lean();
    res.json({ success: true, reminders: updatedDoc.reminders });
  } catch (err) {
    console.error("Task Save Error:", err);
    res.status(500).json({ success: false });
  }
});

router.get("/ai-brief/:cnr", async (req, res) => {
  try {
    const caseData = await Final.findOne({ cnrNumber: req.params.cnr }).lean();
    const hearings = await Final.find({ cnrNumber: req.params.cnr }).sort({
      hearingDate: 1,
    });

    // 1. Dynamic Risk Assessment
    const age = parseFloat(caseData.caseAge) || 0;
    const totalHearings = hearings.length;
    const isHighRisk = age > 2 || totalHearings > 10;

    // 2. Logic-Based Tactical Insights
    let strategy = "";
    if (caseData.natureOfDisposal) {
      strategy =
        "Case concluded. Review final decree for compliance or appeal grounds.";
    } else if (caseData.caseStages?.toLowerCase().includes("evidence")) {
      strategy =
        "Critical Stage: Ensure all witnesses are served and exhibits are marked.";
    } else {
      strategy =
        "Procedural Stage: Monitor for delaying tactics from the opposition.";
    }

    // 3. Complexity Score
    const complexity = age > 5 ? "Complex/High Stakes" : "Standard Procedural";

    res.json({
      riskLevel: isHighRisk ? "HIGH" : "NORMAL",
      strategy,
      complexity,
      ageAnalysis: `This matter has been pending for ${age} years across ${totalHearings} hearings.`,
    });
  } catch (err) {
    res.status(500).send("AI Analysis Failed");
  }
});

router.get("/stats-charts/:lawyerName", async (req, res) => {
  try {
    const { lawyerName } = req.params;
    const match = {
      $or: [
        { petitionerAdvocate: lawyerName },
        { respondentAdvocate: lawyerName },
      ],
    };

    // 1. Risk Heatmap (Unique Cases by Age)
    const riskData = await Final.aggregate([
      { $match: match },
      { $group: { _id: "$cnrNumber", age: { $first: "$caseAge" } } }, // De-duplicate
      {
        $bucket: {
          groupBy: { $convert: { input: "$age", to: "double", onError: 0 } },
          boundaries: [0, 1, 2, 5, 20],
          default: "Other",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    // 2. Stage Bottleneck (Unique Cases by Stage)
    const stageData = await Final.aggregate([
      { $match: match },
      { $group: { _id: "$cnrNumber", stage: { $first: "$caseStages" } } }, // De-duplicate
      { $group: { _id: "$stage", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 3. Outcome Analytics (Unique Disposed Cases)
    const outcomeData = await Final.aggregate([
      { $match: { ...match, natureOfDisposal: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$cnrNumber",
          outcome: { $first: "$natureOfDisposalOutcome" },
        },
      }, // De-duplicate
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ]);

    // 4. Hearing Load (Daily Schedule Forecast)
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    // 4. Updated Hearing Load (Dynamic Timeline)
    const loadData = await Final.aggregate([
      {
        $match: {
          ...match,
          nextHearingDate: { $exists: true, $ne: null },
        },
      },
      {
        // Group by Date to count how many hearings occur on each specific day
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$nextHearingDate" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sort chronologically
      { $limit: 15 }, // Show the next 15 scheduled hearing days
    ]);

    res.json({ riskData, stageData, outcomeData, loadData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// New route for a full-screen report page
router.get("/reports/:lawyerName", (req, res) => {
  const { lawyerName } = req.params;
  res.render("reports", { lawyerName });
});

// Ensure this is at the bottom of routes/lawyerRoutes.js
module.exports = router;
