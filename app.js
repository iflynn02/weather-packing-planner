require("dotenv").config();
require("./db");

const express = require("express");
const app = express();
const path = require("path");

const Trip = require("./models/Trip");
const plannerRoutes = require("./routes/planner");
const tripRoutes = require("./routes/trips");

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ dateSaved: -1 }).limit(5);
    res.render("index", { trips });
  } catch (err) {
    console.error("Failed to load trips for homepage:", err);
    res.render("index", { trips: [] });
  }
});

app.use("/planTrip", plannerRoutes);
app.use("/", tripRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
