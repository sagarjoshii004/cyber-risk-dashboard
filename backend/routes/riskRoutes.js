
const express = require("express");
const mongoose = require("mongoose");
const Risk = require("../models/Risk");

const router = express.Router();

function getRiskValues(body, isUpdate = false) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const asset = String(body.asset || "").trim();
  const likelihood = Number(body.likelihood);
  const impact = Number(body.impact);

  if (!title) throw new Error("Risk title is required.");

  if (!Number.isInteger(likelihood) || likelihood < 1 || likelihood > 5) {
    throw new Error("Likelihood must be a whole number from 1 to 5.");
  }

  if (!Number.isInteger(impact) || impact < 1 || impact > 5) {
    throw new Error("Impact must be a whole number from 1 to 5.");
  }

  const score = likelihood * impact;
  let severity = "Low";

  if (score >= 20) severity = "Critical";
  else if (score >= 12) severity = "High";
  else if (score >= 6) severity = "Medium";

  const values = {
    title,
    description,
    asset,
    likelihood,
    impact,
    score,
    severity
  };

  if (isUpdate || body.status !== undefined) {
    const status = body.status || "Open";

    if (!["Open", "In Progress", "Resolved"].includes(status)) {
      throw new Error("Invalid risk status.");
    }

    values.status = status;
  }

  return values;
}

router.get("/", async (req, res) => {
  try {
    const risks = await Risk.find().sort({ createdAt: -1 });
    res.json(risks);
  } catch (error) {
    res.status(500).json({ message: "Could not load risks." });
  }
});

router.post("/", async (req, res) => {
  try {
    const values = getRiskValues(req.body);
    const risk = await Risk.create(values);
    res.status(201).json(risk);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid risk ID." });
    }

    const values = getRiskValues(req.body, true);

    const risk = await Risk.findByIdAndUpdate(
      req.params.id,
      values,
      { new: true, runValidators: true }
    );

    if (!risk) {
      return res.status(404).json({ message: "Risk not found." });
    }

    res.json(risk);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid risk ID." });
    }

    const risk = await Risk.findByIdAndDelete(req.params.id);

    if (!risk) {
      return res.status(404).json({ message: "Risk not found." });
    }

    res.json({ message: "Risk deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete risk." });
  }
});

module.exports = router;
