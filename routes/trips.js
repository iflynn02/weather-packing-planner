const Trip = require("../models/Trip");
const express = require("express");
const router = express.Router();

router.get("/history", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ dateSaved: -1 });
    res.render("tripHistory", { trips });
  } catch (err) {
    console.error("Failed to fetch trip history:", err);
    res.status(500).send("Error loading trip history.");
  }
});

router.post("/history/delete/:id", async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.id);
    res.redirect("/history");
  } catch (err) {
    console.error("Failed to delete trip:", err);
    res.status(500).send("Error deleting trip.");
  }
});

module.exports = router;
