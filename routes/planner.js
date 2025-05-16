const Trip = require("../models/Trip");
const express = require("express");
const router = express.Router();

async function getCoordinates(city, state, country) {
  const locationQuery = [city, state, country].filter(Boolean).join(", ");
  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5`;

  const response = await fetch(geocodeUrl);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("Location not found");
  }

  const match = data.results.find(r => {
    const matchState = state ? r.admin1?.toLowerCase().includes(state.toLowerCase()) : true;
    const matchCountry = country ? r.country?.toLowerCase().includes(country.toLowerCase()) : true;
    return matchState && matchCountry;
  });

  if (!match) {
    throw new Error("Matching location not found");
  }

  const { latitude, longitude } = match;
  return { latitude, longitude };
}



router.post("/", async (req, res) => {
  const { city, state, country, startDate, endDate, nearWater } = req.body;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  try {
    const { latitude, longitude } = await getCoordinates(city, state, country);
    const toISODate = dateStr => new Date(dateStr).toISOString().split("T")[0];
    const startISO = toISODate(startDate);
    const endISO = toISODate(endDate);
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,snowfall_sum&timezone=auto&start_date=${startISO}&end_date=${endISO}&temperature_unit=fahrenheit`;


    console.log("Calling Open-Meteo API:", apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      throw new Error("Unexpected response structure from Open-Meteo API.");
    }

    const forecast = data.daily;
    const temps = forecast.temperature_2m_max;
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

    let packingList = ["Toiletries", "Bath Towel", "Chargers", "Shoes", "Pajamas"];

    if (temps.some(temp => temp > 70)) {
      packingList.push("Sunglasses");
    }

    if (nearWater === "yes") {
      packingList.push("Swimsuit", "Beach Towel", "Flip-flops");
    }

    if (forecast.uv_index_max.some(uv => uv > 3)) {
      packingList.push("Sunscreen");
    }

    let needsJacket = false;
    let needsCoat = false;
    let needsHatGloves = false;
    let shorts = 0;
    let tShirts = 0;
    let longSleeves = 0;
    let pants = 0;

    for (let i = 0; i < temps.length; i++) {
      const min = forecast.temperature_2m_min[i];
      const max = forecast.temperature_2m_max[i];

      if (min < 65) needsJacket = true;
      if (min < 50) needsCoat = true;
      if (min < 45) needsHatGloves = true;

      if (min < 68) {
        longSleeves++;
        pants++;
      }
      if (max >= 68) {
        tShirts++;
        shorts++;
      }
    }

    if (tShirts > 0)
      packingList.push(`${tShirts} short-sleeve shirt${tShirts !== 1 ? 's' : ''}`);

    if (shorts > 0)
      packingList.push(`${shorts} pair${shorts !== 1 ? 's' : ''} of shorts`);

    if (longSleeves > 0)
      packingList.push(`${longSleeves} long-sleeve shirt${longSleeves !== 1 ? 's' : ''}`);

    if (pants > 0)
      packingList.push(`${pants} pair${pants !== 1 ? 's' : ''} of pants`);

    packingList.push(`${2 * days} pair${2 * days !== 1 ? 's' : ''} of underwear`);
    packingList.push(`${days} pair${days !== 1 ? 's' : ''} of socks`);

    if (needsJacket) packingList.push("Jacket");
    if (needsCoat) packingList.push("Coat");
    if (needsHatGloves) packingList.push("Hat", "Gloves");

    if (forecast.precipitation_probability_max.some(p => p > 50)) {
      packingList.push("Umbrella", "Raincoat");
    }

    if (forecast.snowfall_sum.some(snow => snow > 0)) {
      if (!packingList.includes("Coat")) packingList.push("Coat");
      if (!packingList.includes("Hat")) packingList.push("Hat");
      if (!packingList.includes("Gloves")) packingList.push("Gloves");
      packingList.push("Snow boots");
    }

    const newTrip = new Trip({
      city: city.trim(),
      startDate,
      endDate,
      days,
      avgTemp,
      packingList
    });

    await newTrip.save();

    res.render("result", {
      city: city.trim(),
      days,
      avgTemp: avgTemp.toFixed(1),
      packingList,
      startDate,
      endDate
    });
  } catch (error) {
    console.error("Weather API error:", error.message || error);
    res.send("Could not get weather data. Please try again.");
  }
});

module.exports = router;
