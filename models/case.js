const mongoose = require("mongoose");

const CaseSchema = new mongoose.Schema({
  // --- Identifiers ---
  cnrNumber: { type: String, unique: true, required: true },
  caseNumber: String,
  combinedCaseNumber: String,
  filingNumber: String,
  registrationNumber: String,

  // --- Case Details ---
  caseType: String,
  currentStatus: String,
  natureOfDisposal: String,
  underActs: String,
  underSections: String,
  year: Number,
  
  // --- Court & Legal Info ---
  courtName: String,
  courtNumber: String,
  nameOfHighCourt: String,
  judgeName: String,
  policeStation: String,
  lawyerId: String, // Synthetic assignment

  // --- Dates & Temporal Data ---
  dateFiled: Date,
  decisionDate: Date,
  registrationDate: Date,
  lastSyncTime: String,
  disposalYear: Number,
  disposalTime: Number, // DISPOSALTIME_ADJ
  
  // --- Analytics / Logic ---
  disposalBinary: String // contested / uncontested
}, { timestamps: true });

module.exports = mongoose.model("Case", CaseSchema);