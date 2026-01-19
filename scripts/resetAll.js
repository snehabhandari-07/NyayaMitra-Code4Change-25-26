const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = require("../db");

// Models
const Case = require("../models/case");
const Hearing = require("../models/hearing");
const Insight = require("../models/insight");

const reset = async () => {
    await connectDB();
    console.log("Cleaning database...");
    
    await Case.deleteMany({});
    await Hearing.deleteMany({});
    await Insight.deleteMany({});
    
    console.log("Database cleared. Ready for fresh import.");
    process.exit();
};

reset();