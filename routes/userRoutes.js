const express = require('express');
const router = express.Router();    
const Final = require("../models/final"); // The Master Model

router.get("/portal", (req, res) => {
    // This renders the page containing both the CNR Search 
    // and the "Zero Knowledge" Legal Encyclopedia
    res.render("userDashboard", { 
        title: "NyayaMitra Citizen Portal",
        userType: "citizen" 
    });
});

router.get("/case-lookup/:cnr", async (req, res) => {
    try {
        const cnr = req.params.cnr;
        // Fetch ALL entries to show the full journey
        const history = await Final.find({ cnrNumber: cnr }).sort({ hearingDate: -1 }).lean();

        if (!history || history.length === 0) return res.status(404).json({ message: "Case not found" });

        const latest = history[0]; // The very first item is the newest

        const stageExplanations = {
            "Admission": "The court is deciding if your case has enough merit to be heard.",
            "Evidence": "Both sides are presenting documents and witnesses to prove their facts.",
            "Orders / Judgment": "The judge is writing the final decision for your case.",
            "Arguments": "Lawyers from both sides are giving their final summaries to the judge."
        };

        res.json({
            cnr: latest.cnrNumber,
            status: latest.natureOfDisposal ? "Completed" : "In Progress",
            currentStage: latest.caseStages,
            explanation: stageExplanations[latest.caseStages] || "Standard court procedures.",
            nextHearing: latest.nextHearingDate,
            courtLocation: `Hall ${latest.courtHallNumber}, ${latest.courtName}`,
            // NEW: Send the history so the frontend can build a timeline
            history: history.map(h => ({
                date: h.hearingDate,
                stage: h.caseStages,
                purpose: h.purposeOfHearing
            }))
        });
    } catch (err) {
        res.status(500).send("Error fetching case");
    }
});

module.exports = router;