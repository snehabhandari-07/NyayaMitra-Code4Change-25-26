const mongoose = require("mongoose");

const HearingSchema = new mongoose.Schema({
  cnrNumber: { type: String, index: true },
  hearingId: String,
  caseUniqueValue: String,
  fullIdentifier: String,
  combinedCaseNumber: String,
  caseType: String,

  petitionerAdvocate: String,
  respondentAdvocate: String,

  currentStage: String,
  remappedStages: String,
  lastActionTaken: String,
  purposeOfHearing: String,

  beforeHonourableJudges: String,
  beforeHonourableJudgeOne: String,
  beforeHonourableJudgeTwo: String,
  beforeHonourableJudgeThree: String,
  beforeHonourableJudgeFour: String,
  beforeHonourableJudgeFive: String,
  njdgJudgeName: String,

  businessOnDate: Date,
  nextHearingDate: Date,
  appearanceDate: Date,
  syncDate: Date,
  previousHearing: String,

  courtName: String,
  courtCode: String,
  courtType: String,
  courtState: String,
  courtHallNumber: String,
  boardSrNo: String,
  parsingYear: String
}, { timestamps: true });

module.exports = mongoose.model("Hearing", HearingSchema);