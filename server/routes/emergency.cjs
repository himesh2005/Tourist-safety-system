const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const EMERGENCY_DATA_PATH = path.join(__dirname, "..", "data", "emergency-services.json");

function loadEmergencyData() {
  const raw = fs.readFileSync(EMERGENCY_DATA_PATH, "utf8");
  return JSON.parse(raw);
}

function toRad(degree) {
  return (degree * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeCityInput(city) {
  const value = String(city || "").trim().toLowerCase();
  if (value === "nagpur-demo" || value === "nagpur demo" || value === "nagpur (demo alert mode)") {
    return "Nagpur";
  }
  const title = value.charAt(0).toUpperCase() + value.slice(1);
  return title;
}

function sortByDistance(list, lat, lng) {
  return list
    .map((entry) => ({
      ...entry,
      _distanceKm:
        Number.isFinite(Number(entry?.latitude)) && Number.isFinite(Number(entry?.longitude))
          ? haversineKm(lat, lng, Number(entry.latitude), Number(entry.longitude))
          : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a._distanceKm - b._distanceKm)
    .map(({ _distanceKm, ...rest }) => rest);
}

router.get("/api/emergency", (req, res) => {
  try {
    const city = normalizeCityInput(req.query.city);
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!city) return res.status(400).json({ error: "city is required" });
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng must be valid numbers" });
    }

    const data = loadEmergencyData();
    const cityData = data[city];
    if (!cityData) {
      return res.status(404).json({ error: "City not found in emergency dataset" });
    }

    const hospitals = Array.isArray(cityData.hospitals) ? cityData.hospitals : [];
    const policeStations = Array.isArray(cityData.police_stations) ? cityData.police_stations : [];

    return res.json({
      hospitals: sortByDistance(hospitals, lat, lng),
      police_stations: sortByDistance(policeStations, lat, lng),
    });
  } catch (err) {
    console.log("EMERGENCY /api/emergency ERROR:", err);
    return res.status(500).json({ error: "Failed to load emergency services" });
  }
});

module.exports = router;
