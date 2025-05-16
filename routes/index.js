const express = require("express");
const router = express.Router();
const Trip = require("../models/Trip");

router.get("/", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ dateSaved: -1 }).limit(5);
    res.render("index", { trips });
  } catch (err) {
    console.error("Error fetching trips:", err);
    res.render("index", { trips: [] });
  }
});

module.exports = router;
