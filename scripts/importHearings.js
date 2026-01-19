const mongoose = require("mongoose");
const XLSX = require("xlsx");
require("dotenv").config();

const connectDB = require("../db");
const Hearing = require("../models/hearing");

// --- Helper Function to Clean Dates ---
const parseSafeDate = (value) => {
    if (!value || value === "" || value === "N/A") return null;
    const date = new Date(value);
    // Check if the date is valid. if not, return null so Mongoose doesn't crash
    return isNaN(date.getTime()) ? null : date;
};

(async () => {
    await connectDB();

    const workbook = XLSX.readFile("hearing.xlsx");
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Starting import of ${rows.length} hearing records...`);

    for (let row of rows) {
        try {
            await Hearing.create({
                // --- Primary Identifiers ---
                cnrNumber: row["CNR_NUMBER"],
                hearingId: row["Hearing_ID"],
                caseUniqueValue: row["CaseUniqueValue"],
                fullIdentifier: row["Full_Identifier"],
                combinedCaseNumber: row["Combined_Case_Number"],
                caseType: row["casetype"],

                // --- Legal Representatives ---
                petitionerAdvocate: row["PetitionerAdvocate"],
                respondentAdvocate: row["RespondentAdvocate"],

                // --- Status and Stages ---
                currentStage: row["CurrentStage"],
                remappedStages: row["Remappedstages"],
                lastActionTaken: row["LastActionTaken"],
                purposeOfHearing: row["PurposeOfHearing"],

                // --- Judges ---
                beforeHonourableJudges: row["BeforeHonourableJudges"],
                beforeHonourableJudgeOne: row["BeforeHonourableJudgeOne"],
                beforeHonourableJudgeTwo: row["BeforeHonourableJudgeTwo"],
                beforeHonourableJudgeThree: row["BeforeHonourableJudgeThree"],
                beforeHonourableJudgeFour: row["BeforeHonourableJudgeFour"],
                beforeHonourableJudgeFive: row["BeforeHonourableJudgeFive"],
                njdgJudgeName: row["Njdg_Judge_Name"],

                // --- SAFE Dates (Using helper) ---
                businessOnDate: parseSafeDate(row["BusinessOnDate"]),
                nextHearingDate: parseSafeDate(row["NextHearingDate"]),
                appearanceDate: parseSafeDate(row["AppearanceDate"]),
                syncDate: parseSafeDate(row["SyncDate"]),
                previousHearing: row["PreviousHearing"],

                // --- Court Information ---
                courtName: row["CourtName"],
                courtCode: row["CourtCode"],
                courtType: row["CourtType"],
                courtState: row["CourtSate"],
                courtHallNumber: row["CourtHallNumber"],
                boardSrNo: row["BoardSrNo"],
                parsingYear: row["ParsingYear"]
            });
        } catch (err) {
            // Logs the CNR so you can check that specific row in Excel
            console.error(`Error at CNR ${row["CNR_NUMBER"]}:`, err.message);
        }
    }

    console.log("Hearings imported successfully (with invalid dates ignored).");
    mongoose.connection.close();
})();