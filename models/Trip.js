const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema({
  city: String,
  startDate: Date,
  endDate: Date,
  days: Number,
  avgTemp: Number,
  packingList: [String],
  dateSaved: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Trip", tripSchema);
