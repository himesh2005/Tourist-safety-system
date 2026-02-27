const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const ZONES_PATH = path.join(__dirname, "..", "data", "zones.json");

router.get("/api/zones", (req, res) => {
  try {
    const raw = fs.readFileSync(ZONES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("zones.json must contain an array");
    }
    return res.json(parsed);
  } catch (err) {
    console.log("GEOFENCE /api/zones ERROR:", err);
    return res.status(500).json({ error: "Failed to load geofence zones" });
  }
});

router.get("/map", (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tourist Safety Geofence Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: Arial, sans-serif; background: #f5f7fa; }
    #app { position: relative; height: 100%; width: 100%; }
    #map { height: 100%; width: 100%; }
    #warningBanner {
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      z-index: 2000;
      display: none;
      background: #b91c1c;
      color: #fff;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid #ef4444;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      font-weight: 700;
      line-height: 1.35;
    }
    #statusPill {
      position: fixed;
      bottom: 14px;
      left: 10px;
      right: 10px;
      z-index: 2000;
      background: rgba(17, 24, 39, 0.88);
      color: #fff;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 14px;
      line-height: 1.3;
    }
    @media (min-width: 700px) {
      #warningBanner, #statusPill { left: 16px; right: auto; width: 420px; }
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="warningBanner"></div>
    <div id="statusPill">Loading zones...</div>
    <div id="map"></div>
  </div>

  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script>
    (function () {
      const NAGPUR_CENTER = [21.1458, 79.0882];
      const map = L.map("map").setView(NAGPUR_CENTER, 13);
      const warningBanner = document.getElementById("warningBanner");
      const statusPill = document.getElementById("statusPill");
      const zoneLayers = [];
      let zones = [];
      let userMarker = null;

      function setStatus(message) {
        statusPill.textContent = message;
      }

      function setWarning(zoneName) {
        if (!zoneName) {
          warningBanner.style.display = "none";
          warningBanner.textContent = "";
          return;
        }
        warningBanner.innerHTML = "⚠ WARNING<br/>You have entered a restricted area: " + zoneName;
        warningBanner.style.display = "block";
      }

      function isPointInPolygon(point, polygon) {
        const y = point[0];
        const x = point[1];
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const yi = polygon[i][0];
          const xi = polygon[i][1];
          const yj = polygon[j][0];
          const xj = polygon[j][1];

          const intersects = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);

          if (intersects) inside = !inside;
        }
        return inside;
      }

      function validateZones(input) {
        if (!Array.isArray(input)) return [];
        return input.filter(function (zone) {
          return zone &&
            typeof zone.id === "string" &&
            typeof zone.name === "string" &&
            (zone.type === "restricted" || zone.type === "caution") &&
            Array.isArray(zone.coordinates) &&
            zone.coordinates.length >= 3 &&
            zone.coordinates.every(function (pair) {
              return Array.isArray(pair) &&
                pair.length === 2 &&
                Number.isFinite(Number(pair[0])) &&
                Number.isFinite(Number(pair[1]));
            });
        });
      }

      function renderZones() {
        zoneLayers.forEach(function (layer) { map.removeLayer(layer); });
        zoneLayers.length = 0;

        zones.forEach(function (zone) {
          const color = zone.type === "restricted" ? "#dc2626" : "#eab308";
          const polygon = L.polygon(zone.coordinates, { color: color, weight: 2, fillOpacity: 0.22 });
          polygon.bindPopup(zone.name + " (" + zone.type + ")");
          polygon.addTo(map);
          zoneLayers.push(polygon);
        });
      }

      function evaluateGeofence(lat, lng) {
        const point = [lat, lng];
        let restrictedMatch = null;

        zones.forEach(function (zone) {
          if (!restrictedMatch && zone.type === "restricted" && isPointInPolygon(point, zone.coordinates)) {
            restrictedMatch = zone;
          }
        });

        if (restrictedMatch) {
          setWarning(restrictedMatch.name);
          setStatus("Live location active. Restricted zone detected.");
        } else {
          setWarning(null);
          setStatus("Live location active. You are outside restricted zones.");
        }
      }

      function onLocationSuccess(position) {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setStatus("Location received but invalid coordinates.");
          return;
        }

        if (!userMarker) {
          userMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: "#1d4ed8",
            fillColor: "#3b82f6",
            fillOpacity: 0.95,
            weight: 2
          }).addTo(map).bindPopup("Your live location");
        } else {
          userMarker.setLatLng([lat, lng]);
        }

        evaluateGeofence(lat, lng);
      }

      function onLocationError(error) {
        let msg = "Unable to get location.";
        if (error && error.code === 1) msg = "Location permission denied.";
        if (error && error.code === 2) msg = "Location unavailable.";
        if (error && error.code === 3) msg = "Location request timed out.";
        setStatus(msg + " Enable location to use geofence alerts.");
      }

      async function init() {
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        try {
          const response = await fetch("/api/zones", { cache: "no-store" });
          if (!response.ok) throw new Error("Zone API failed with status " + response.status);
          const data = await response.json();
          zones = validateZones(data);
          if (zones.length === 0) {
            setStatus("No zones configured. Contact administrator.");
          } else {
            setStatus("Zones loaded. Waiting for live location...");
          }
          renderZones();
        } catch (err) {
          console.error(err);
          setStatus("Failed to load zones. Please retry.");
          zones = [];
        }

        if (!("geolocation" in navigator)) {
          alert("Geolocation is not supported on this device/browser.");
          setStatus("Geolocation not available on this device.");
          return;
        }

        navigator.geolocation.watchPosition(
          onLocationSuccess,
          onLocationError,
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
        );
      }

      init();
    })();
  </script>
</body>
</html>`);
});

module.exports = router;
