
const mongoose = require("mongoose");

const riskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    asset: {
      type: String,
      default: ""
    },
    likelihood: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    impact: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    score: {
      type: Number,
      required: true
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      required: true
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Risk", riskSchema);
