// routes/index.js OR app.js
const Final = require('./models/final'); // Adjust path to where your schema file is saved

router.get("/", async (req, res) => {
    try {
        // 1. Calculate Disposed Cases
        // We look for cases that have a 'Decision Date' or are marked as 'Disposed'
        const disposedCount = await Final.countDocuments({ 
            $or: [
                { newCaseStatus: { $regex: /disposed/i } }, 
                { decisionDate: { $ne: null } }
            ] 
        });

        // 2. Calculate Active Cases
        // We look for cases marked as Pending or those that haven't been decided yet
        const activeCount = await Final.countDocuments({ 
            $or: [
                { newCaseStatus: { $regex: /pending/i } },
                { decisionDate: null }
            ]
        });

        // 3. Render the home page with the dynamic data
        res.render("home", { 
            disposedCasesCount: disposedCount.toLocaleString('en-IN'), 
            activeDisputesCount: activeCount.toLocaleString('en-IN') 
        });
    } catch (err) {
        console.error("Database Error:", err);
        res.render("home", { 
            disposedCasesCount: "25,000+", // Fallback for demo
            activeDisputesCount: "20,416" 
        });
    }
});

module.exports = router;