const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = require("../db");
const Case = require("../models/case");
const Insight = require("../models/insight");

const generateInsights = async () => {
    try {
        await connectDB();
        console.time("Generation Time");

        // 1. Ensure Indexes for high-speed lookups
        // await mongoose.connection.collection('cases').createIndex({ cnrNumber: 1 });
        // await mongoose.connection.collection('hearings').createIndex({ cnrNumber: 1 });

        const insights = await Case.aggregate([
            {
                $lookup: {
                    from: "hearings",
                    localField: "cnrNumber",
                    foreignField: "cnrNumber",
                    as: "history"
                }
            },
            {
                $addFields: {
                    // --- Analytics & Aggregated Hearing Data ---
                    totalHearings: { $size: "$history" },
                    lastStage: { $ifNull: [{ $arrayElemAt: ["$history.remappedStages", -1] }, "N/A"] },
                    nextHearingDate: { $arrayElemAt: ["$history.nextHearingDate", -1] },
                    petitionerAdvocate: { $ifNull: [{ $arrayElemAt: ["$history.petitionerAdvocate", 0] }, "N/A"] },
                    respondentAdvocate: { $ifNull: [{ $arrayElemAt: ["$history.respondentAdvocate", 0] }, "N/A"] },

                    // --- Robust Pendency Calculation ---
                    pendencyDays: {
                        $cond: {
                            if: { 
                                $and: [
                                    { $ne: ["$dateFiled", null] }, // Check if date is not null
                                    { $lt: ["$dateFiled", new Date()] } // Ensure it's in the past
                                ] 
                            },
                            then: {
                                $floor: {
                                    $divide: [
                                        { $subtract: [new Date(), "$dateFiled"] },
                                        86400000 // ms to days
                                    ]
                                }
                            },
                            else: 0 // Default to 0 if date is missing or invalid
                        }
                    }
                }
            },
            {
                $addFields: {
                    // UI Logic Flag
                    isDelayed: { 
                        $or: [
                            { $gt: ["$totalHearings", 7] }, 
                            { $gt: ["$pendencyDays", 365] } 
                        ] 
                    }
                }
            },
            {
                // Merges original Case fields + the new calculated fields into the Root
                $replaceRoot: { 
                    newRoot: { $mergeObjects: ["$$ROOT", { lastCalculated: new Date() }] } 
                }
            }
        ]);

        // 2. Sync to Insight Collection using BulkWrite
        const ops = insights.map(doc => {
            const { history, ...cleanDoc } = doc; // Remove raw history array to save space
            return {
                updateOne: {
                    filter: { cnrNumber: doc.cnrNumber },
                    update: { $set: cleanDoc },
                    upsert: true
                }
            };
        });

        if (ops.length > 0) {
            await Insight.bulkWrite(ops);
        }
        
        console.timeEnd("Generation Time");
        console.log(`Success: ${insights.length} records synced to Insights with full field availability.`);
        process.exit();
    } catch (err) {
        console.error("Aggregation Error:", err);
        process.exit(1);
    }
};

generateInsights();