const mongoose = require("mongoose");
const XLSX = require("xlsx");
require("dotenv").config();
const connectDB = require("../db");
const Case = require("../models/case");

// Realistic Pool: 50 Lawyers (LAW-001 to LAW-050)
const LAWYERS = Array.from({ length: 50 }, (_, i) => `LAW-${(i + 1).toString().padStart(3, '0')}`);

(async () => {
    await connectDB();
    const workbook = XLSX.readFile("cases.xlsx");
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    for (let row of rows) {
        try {
            await Case.create({
                cnrNumber: row["CNR_NUMBER"],
                caseNumber: row["CASE_NUMBER"],
                caseType: row["CASE_TYPE"],
                combinedCaseNumber: row["COMBINED_CASE_NUMBER"],
                courtName: row["COURT_NAME"],
                courtNumber: row["COURT_NUMBER"],
                nameOfHighCourt: row["NAME_OF_HIGH_COURT"], // Mapping based on visible text
                currentStatus: row["CURRENT_STATUS"],
                dateFiled: row["DATE_FILED"] ? new Date(row["DATE_FILED"]) : null,
                decisionDate: row["DECISION_DATE"] ? new Date(row["DECISION_DATE"]) : null,
                filingNumber: row["FILING_NUMBER"],
                lastSyncTime: row["LAST_SYNC_TIME"],
                natureOfDisposal: row["NATURE_OF_DISPOSAL"], 
                policeStation: row["POLICE_STATION"],
                registrationNumber: row["REGISTRATION_NUMBER"], // Adjusted for truncation
                registrationDate: row["REGISTRATIO_DATE"], // Assuming the second "REGISTRATIO" is date
                underActs: row["UNDER_ACTS"],
                underSections: row["UNDER_SECTIONS"],
                year: row["YEAR"],
                disposalYear: row["DISPOSAL_YEAR"],
                disposalTime: Number(row["DISPOSALTIME_ADJ"]),
                
                // --- Logic Fields ---
                judgeName: row["NJDG_JUDGE_NAME"],
                lawyerId: LAWYERS[Math.floor(Math.random() * LAWYERS.length)]
            });
        } catch (err) {
            console.error(`Insert error for CNR ${row["CNR_NUMBER"]}:`, err.message);
        }
    }
    
    console.log("All columns imported and 50 Lawyers assigned successfully.");
    mongoose.connection.close();
})();