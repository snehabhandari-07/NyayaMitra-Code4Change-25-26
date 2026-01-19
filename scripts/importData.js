const mongoose = require('mongoose');
const csv = require('csvtojson');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../db');
const Final = require('../models/final');

const parseDate = (d) => {
    if (!d || d === "NA" || d === "" || d === " ") return null;
    const p = d.split('-');
    return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]) : null;
};

async function importCSV() {
    try {
        await connectDB();
        await Final.deleteMany({});
        console.log('Database Cleared. Starting streamed import...');

        const csvPath = path.join(__dirname, '..', 'data', 'Combined_Cases_Hearings.csv');
        
        let count = 0;
        let batch = [];
        const BATCH_SIZE = 500; 

        await csv()
            .fromFile(csvPath)
            .subscribe(async (r) => {
                // Pre-calculate logic for AI Summary
                const caseAgeNum = parseFloat(r['Case Age']) || 0;
                const isDelayed = caseAgeNum > 2; // Threshold for "High Risk"

                const processedRow = {
                    cnrNumber: r.CNR_NUMBER,
                    caseNumber: r.CASE_NUMBER,
                    caseTypeOld: r.CASE_TYPE_OLD,
                    combinedCaseNumber: r.COMBINED_CASE_NUMBER,
                    courtName: r.COURT_NAME,
                    courtNumber: r.COURT_NUMBER,
                    nameOfHighCourt: r.NAME_OF_HIGH_COURT,
                    currentStatusOld: r['CURRENT_STATUS-OLD'],
                    dateFiled: parseDate(r.DATE_FILED),
                    decisionDate: parseDate(r.DECISION_DATE),
                    filingNumber: r.FILING_NUMBER,
                    natureOfDisposal: r.NATURE_OF_DISPOSAL,
                    natureOfDisposalOutcome: r.NATURE_OF_DISPOSAL_OUTCOME,
                    njdgJudgeName: r.NJDG_JUDGE_NAME,
                    registrationDate: parseDate(r.REGISTRATION_DATE),
                    registrationNumber: r.REGISTRATION_NUMBER,
                    underActs: r.UNDER_ACTS,
                    underSections: r.UNDER_SECTIONS,
                    year: r.YEAR,
                    natureOfDisposalBinary: r.NATURE_OF_DISPOSAL_BINARY,
                    disposalYear: r.DISPOSAL_YEAR,
                    disposalTimeAdj: r.DISPOSALTIME_ADJ,
                    caseDurationDays: parseFloat(r.CASE_DURATION_DAYS) || 0,
                    filedYear: r.FILED_YEAR,
                    filedMonth: r.FILED_MONTH,
                    filedQuarter: r.FILED_QUARTER,
                    decisionYear: r.DECISION_YEAR,
                    decisionMonth: r.DECISION_MONTH,
                    decisionQuarter: r.DECISION_QUARTER,
                    petitionerAdvocate: r.PetitionerAdvocate,
                    respondentAdvocate: r.RespondentAdvocate,
                    beforeHonourableJudges: r.BeforeHonourableJudges,
                    beforeHonourableJudgeTwo: r.BeforeHonourableJudgeTwo,
                    nextHearingDate: parseDate(r.NextHearingDate),
                    combinedCaseNumberAlt: r.CombinedCaseNumber,
                    dateOfAppearance: parseDate(r.DateofAppearance),
                    purposeOfHearing: r.PurposeOfHearing,
                    courtNameAlt: r.CourtName,
                    parsingYear: r.ParsingYear,
                    courtType: r.CourtType,
                    courtSate: r.CourtSate,
                    courtHallNumber: r.CourtHallNumber,
                    fullIdentifier: r.Full_Identifier,
                    caseUniqueValue: r.CaseUniqueValue,
                    previousHearing: r.PreviousHearing,
                    hearingId: r.Hearing_ID,
                    caseStages: r.Case_Stages,
                    caseYear: r.CaseYear,
                    hearingDate: parseDate(r.HearingDate),
                    hearingSequence: r.HearingSequence,
                    hearingGapDays: parseFloat(r.HearingGap_Days) || 0,
                    isLastHearing: r.IsLastHearing,
                    nextHearingLabel: r.NextHearingLabel,
                    clientNames: r['Client Names'],
                    caseType: r['Case Type'],
                    caseAge: r['Case Age'],
                    newCaseStatus: r.New_Case_status,

                    // --- INITIALIZE UI & ANALYTICS FIELDS ---
                    isDelayed: isDelayed,
                    lastStage: r.Case_Stages || "Pending",
                    totalHearings: 1, // Will be incremented by the aggregate dashboard view
                    privateNotes: "", 
                    reminders: []
                };

                batch.push(processedRow);
                
                if (batch.length >= BATCH_SIZE) {
                    const toInsert = [...batch];
                    batch = []; 
                    await Final.insertMany(toInsert);
                    count += toInsert.length;
                    console.log(`Imported ${count} records...`);
                }
            });

        // Insert remaining records
        if (batch.length > 0) {
            await Final.insertMany(batch);
            count += batch.length;
        }

        console.log(`Final Success! Total Imported: ${count}`);
        process.exit(0);
    } catch (e) {
        console.error("FATAL IMPORT ERROR:", e.message);
        process.exit(1);
    }
}

importCSV();