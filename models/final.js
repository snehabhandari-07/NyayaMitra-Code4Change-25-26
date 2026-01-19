const mongoose = require('mongoose');

const finalSchema = new mongoose.Schema({
    // --- CORE IDENTIFIERS (From Master CSV) ---
    cnrNumber: { type: String, index: true, required: true }, // CNR_NUMBER
    caseNumber: String, // CASE_NUMBER
    caseTypeOld: String, // CASE_TYPE_OLD
    combinedCaseNumber: String, // COMBINED_CASE_NUMBER
    combinedCaseNumberAlt: String, // CombinedCaseNumber
    fullIdentifier: String, // Full_Identifier
    caseUniqueValue: String, // CaseUniqueValue
    hearingId: String, // Hearing_ID

    // --- COURT & JUDICIAL INFO ---
    courtName: String, // COURT_NAME
    courtNameAlt: String, // CourtName
    courtNumber: String, // COURT_NUMBER
    nameOfHighCourt: String, // NAME_OF_HIGH_COURT
    njdgJudgeName: String, // NJDG_JUDGE_NAME
    beforeHonourableJudges: String, // BeforeHonourableJudges
    beforeHonourableJudgeTwo: String, // BeforeHonourableJudgeTwo
    courtType: String, // CourtType
    courtSate: String, // CourtSate
    courtHallNumber: String, // CourtHallNumber

    // --- PARTIES & ADVOCATES (Login & Portfolio Keys) ---
    petitionerAdvocate: { type: String, index: true }, // PetitionerAdvocate
    respondentAdvocate: { type: String, index: true }, // RespondentAdvocate
    clientNames: String, // Client Names

    // --- LEGAL CONTEXT ---
    underActs: String, // UNDER_ACTS
    underSections: String, // UNDER_SECTIONS
    caseType: String, // Case Type
    year: String, // YEAR
    caseYear: String, // CaseYear
    parsingYear: String, // ParsingYear

    // --- STATUS & STAGES ---
    currentStatusOld: String, // CURRENT_STATUS-OLD
    newCaseStatus: String, // New_Case_status
    caseStages: String, // Case_Stages
    caseAge: String, // Case Age

    // --- DATES (Converted during Import) ---
    dateFiled: Date, // DATE_FILED
    registrationDate: Date, // REGISTRATION_DATE
    decisionDate: Date, // DECISION_DATE
    registrationNumber: String, // REGISTRATION_NUMBER
    filingNumber: String, // FILING_NUMBER
    filedYear: String, // FILED_YEAR
    filedMonth: String, // FILED_MONTH
    filedQuarter: String, // FILED_QUARTER
    decisionYear: String, // DECISION_YEAR
    decisionMonth: String, // DECISION_MONTH
    decisionQuarter: String, // DECISION_QUARTER

    // --- HEARING SPECIFICS ---
    nextHearingDate: Date, // NextHearingDate
    dateOfAppearance: Date, // DateofAppearance
    purposeOfHearing: String, // PurposeOfHearing
    previousHearing: String, // PreviousHearing
    hearingDate: Date, // HearingDate
    hearingSequence: String, // HearingSequence
    hearingGapDays: Number, // HearingGap_Days
    isLastHearing: String, // IsLastHearing
    nextHearingLabel: String, // NextHearingLabel

    // --- DISPOSAL ANALYTICS ---
    natureOfDisposal: String, // NATURE_OF_DISPOSAL
    natureOfDisposalOutcome: String, // NATURE_OF_DISPOSAL_OUTCOME
    natureOfDisposalBinary: String, // NATURE_OF_DISPOSAL_BINARY
    disposalYear: String, // DISPOSAL_YEAR
    disposalTimeAdj: String, // DISPOSALTIME_ADJ
    caseDurationDays: Number, // CASE_DURATION_DAYS

    // =========================================================================
    // --- INTEGRATED INTERACTIVE FIELDS (From Insight Schema) ---
    // These fields allow the UI to save and display lawyer-specific data
    // =========================================================================
    
    // Analytics used by generateAISummary
    totalHearings: { type: Number, default: 0 },
    lastStage: { type: String, default: "Pending" },
    pendencyDays: { type: Number, default: 0 },
    isDelayed: { type: Boolean, default: false },
    statusColor: { type: String },

    // Persistent User Input
    privateNotes: { type: String, default: "" }, 
    reminders: [{
        text: String,
        dateTime: Date,
        completed: { type: Boolean, default: false }
    }],

    // System Refresh Timestamp
    lastSyncTime: { type: String, default: () => new Date().toLocaleString() }

}, { 
    // strict: false allows for flexibility with unexpected Excel columns
    strict: false, 
    timestamps: true 
});

// Optimized index for Login by Advocate Name
finalSchema.index({ petitionerAdvocate: 1, respondentAdvocate: 1 });

module.exports = mongoose.model('Final', finalSchema);