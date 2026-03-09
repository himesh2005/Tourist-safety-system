import { createElement as h, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import L from "leaflet";
import Banner from "./Banner.jsx";
import ZonePopup from "./ZonePopup.jsx";
import EmergencySidebar from "./EmergencyServices/EmergencySidebar.tsx";
import { useNearestEmergencyService } from "./EmergencyServices/useNearestEmergencyService.ts";
import { API_URL } from "../config/env.js";

const BASE_API_URL = String(API_URL || "http://localhost:5000").replace(
  /\/+$/,
  "",
);
const api = (path = "") =>
  `${BASE_API_URL}${String(path).startsWith("/") ? path : `/${path}`}`;

const NAGPUR_CENTER = [21.1458, 79.0882];
const DEMO_LOCATION = [21.1445, 79.091];
const ALERT_INTERVAL_MS = 5 * 60 * 1000;
const EMERGENCY_CITY_BY_KEY = {
  mumbai: "Mumbai",
  pune: "Pune",
  nashik: "Nashik",
  aurangabad: "Aurangabad",
  nagpur: "Nagpur",
  "nagpur-demo": "Nagpur",
};

function isPointInPolygon(point, polygon) {
  const y = point[0];
  const x = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0];
    const xi = polygon[i][1];
    const yj = polygon[j][0];
    const xj = polygon[j][1];

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function normalizeZones(data) {
  if (!Array.isArray(data)) return [];

  return data.filter((zone) => {
    if (!zone || typeof zone !== "object") return false;
    if (!zone.id || !zone.name) return false;

    if (
      zone.type !== "restricted" &&
      zone.type !== "high_crime" &&
      zone.type !== "time_based"
    ) {
      return false;
    }

    if (
      zone.riskLevel !== "low" &&
      zone.riskLevel !== "medium" &&
      zone.riskLevel !== "high"
    ) {
      return false;
    }

    const crimeIndex = Number(zone.crimeIndex);
    if (!Number.isFinite(crimeIndex) || crimeIndex < 0 || crimeIndex > 10)
      return false;

    if (zone.active !== "always" && zone.active !== "time_based") return false;

    if (zone.active === "time_based") {
      if (!zone.activeHours || typeof zone.activeHours !== "object")
        return false;
      const start = Number(zone.activeHours.start);
      const end = Number(zone.activeHours.end);
      if (!Number.isInteger(start) || !Number.isInteger(end)) return false;
      if (start < 0 || start > 23 || end < 0 || end > 24 || start === end)
        return false;
    }

    if (!Array.isArray(zone.coordinates) || zone.coordinates.length < 3)
      return false;

    return zone.coordinates.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        Number.isFinite(Number(pair[0])) &&
        Number.isFinite(Number(pair[1])),
    );
  });
}

function getZoneColor(zoneType) {
  if (zoneType === "restricted") return "#ef4444";
  if (zoneType === "high_crime") return "#f97316";
  return "#a855f7";
}

function squaredDistance(a, b) {
  const dLat = Number(a[0]) - Number(b[0]);
  const dLng = Number(a[1]) - Number(b[1]);
  return dLat * dLat + dLng * dLng;
}

function getDemoAlertIntervalMs() {
  const value = Number(
    typeof localStorage !== "undefined"
      ? localStorage.getItem("demoAlertIntervalMs")
      : 0,
  );
  if (Number.isFinite(value) && value >= 30000) return value;
  return 300000;
}

export default function GeofenceMap() {
  const [zones, setZones] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("nagpur");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [activeZone, setActiveZone] = useState(null);
  const [lastAlertTime, setLastAlertTime] = useState(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedZone, setSelectedZone] = useState(null);
  const [dismissedZoneId, setDismissedZoneId] = useState("");
  const [emergencyInfo, setEmergencyInfo] = useState({
    hospitals: [],
    police_stations: [],
  });
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState("");
  const [showEmergencySidebar, setShowEmergencySidebar] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const zoneLayerGroupRef = useRef(null);
  const emergencyLayerGroupRef = useRef(null);
  const watcherIdRef = useRef(null);
  const activeZoneRef = useRef(null);
  const lastAlertTimeRef = useRef(null);
  const userPickedCityRef = useRef(false);
  const nearestServices = useNearestEmergencyService(
    userPosition,
    emergencyInfo.hospitals,
    emergencyInfo.police_stations,
    selectedCity === "nagpur-demo",
  );

  function getCurrentHour() {
    if (isDemoMode) return 3;
    return currentHour;
  }

  function resolveEmergencyCityName() {
    const key = String(selectedCity || "").toLowerCase();
    if (EMERGENCY_CITY_BY_KEY[key]) return EMERGENCY_CITY_BY_KEY[key];

    const cityEntry = cities.find(
      (entry) => String(entry.key || "").toLowerCase() === key,
    );
    if (!cityEntry?.city) return "";
    const cleaned = String(cityEntry.city)
      .replace(/\s*\(.*\)\s*$/, "")
      .trim();
    return cleaned;
  }

  function isZoneActive(zone, hour = getCurrentHour()) {
    if (!zone || typeof zone !== "object") return false;
    if (zone.active === "always") return true;

    if (zone.active === "time_based" && zone.activeHours) {
      const start = Number(zone.activeHours.start);
      const end = Number(zone.activeHours.end);
      if (!Number.isInteger(start) || !Number.isInteger(end)) return false;

      if (start < end) return hour >= start && hour < end;
      return hour >= start || hour < end;
    }

    return false;
  }

  function evaluatePosition(lat, lng, hourNow) {
    let matchedZone = null;
    for (let i = 0; i < zones.length; i += 1) {
      const zone = zones[i];
      if (!isZoneActive(zone, hourNow)) continue;
      if (isPointInPolygon([lat, lng], zone.coordinates)) {
        matchedZone = zone;
        break;
      }
    }

    if (matchedZone) {
      const previousZoneId = activeZoneRef.current?.id || null;
      const now = Date.now();
      const canRepeatAlert =
        !lastAlertTimeRef.current ||
        now - lastAlertTimeRef.current > ALERT_INTERVAL_MS;

      setActiveZone(matchedZone);
      activeZoneRef.current = matchedZone;

      if (previousZoneId !== matchedZone.id || canRepeatAlert) {
        setLastAlertTime(now);
        lastAlertTimeRef.current = now;
      }
    } else {
      setActiveZone(null);
      activeZoneRef.current = null;
      setLastAlertTime(null);
      lastAlertTimeRef.current = null;
      setDismissedZoneId("");
    }
  }

  useEffect(() => {
    setIsDemoMode(selectedCity === "nagpur-demo");
  }, [selectedCity]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, { zoomAnimation: true }).setView(
      NAGPUR_CENTER,
      12,
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    zoneLayerGroupRef.current = L.layerGroup().addTo(map);
    emergencyLayerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      if (watcherIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      userMarkerRef.current = null;
      zoneLayerGroupRef.current = null;
      emergencyLayerGroupRef.current = null;
      activeZoneRef.current = null;
      lastAlertTimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      try {
        const response = await fetch(api("/api/cities"), { cache: "no-store" });
        if (!response.ok) throw new Error("Cities fetch failed");
        const data = await response.json();
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error("Cities payload invalid");

        const hasDemo = data.some((city) => city.key === "nagpur-demo");
        const finalCities = hasDemo
          ? data
          : [
              ...data,
              {
                key: "nagpur-demo",
                city: "Nagpur (Demo Alert Mode)",
                center: NAGPUR_CENTER,
                zoneCount: 3,
              },
            ];

        setCities(finalCities);
      } catch {
        if (!cancelled) {
          setCities([
            {
              key: "nagpur",
              city: "Nagpur",
              center: NAGPUR_CENTER,
              zoneCount: 0,
            },
            {
              key: "nagpur-demo",
              city: "Nagpur (Demo Alert Mode)",
              center: NAGPUR_CENTER,
              zoneCount: 3,
            },
          ]);
        }
      }
    }

    loadCities();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadZones() {
      try {
        const response = await fetch(
          api(`/api/zones/${encodeURIComponent(selectedCity)}`),
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Zones fetch failed");

        const data = await response.json();
        if (cancelled) return;

        const validZones = normalizeZones(data);
        setZones(validZones);
        setSelectedZone(null);
        setActiveZone(null);
        activeZoneRef.current = null;

        if (validZones.length === 0) {
          setErrorMessage("No geofence zones configured.");
        } else {
          setErrorMessage("");
        }
      } catch {
        if (!cancelled) {
          setZones([]);
          setErrorMessage("Failed to load geofence zones.");
        }
      }
    }

    loadZones();

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  useEffect(() => {
    if (!mapRef.current || cities.length === 0) return;
    const city = cities.find((entry) => entry.key === selectedCity);
    if (!city || !Array.isArray(city.center)) return;
    mapRef.current.setView(city.center, isDemoMode ? 14 : 12, {
      animate: true,
    });
  }, [selectedCity, cities, isDemoMode]);

  useEffect(() => {
    if (!mapRef.current || !zoneLayerGroupRef.current) return;

    zoneLayerGroupRef.current.clearLayers();

    zones.forEach((zone) => {
      if (zone.type === "time_based" && !isZoneActive(zone)) return;

      const color = getZoneColor(zone.type);
      const polygon = L.polygon(zone.coordinates, {
        color,
        weight: 2,
        fillOpacity: 0.2,
      });
      polygon.on("click", (event) => {
        if (event?.originalEvent) {
          L.DomEvent.stopPropagation(event.originalEvent);
        }
        setSelectedZone(zone);
      });
      polygon.addTo(zoneLayerGroupRef.current);
    });
  }, [zones, currentHour, isDemoMode]);

  useEffect(() => {
    if (!mapRef.current) return undefined;

    if (isDemoMode) {
      if (watcherIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }

      const [lat, lng] = DEMO_LOCATION;
      setUserPosition([lat, lng]);
      setErrorMessage("");

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          color: "#1d4ed8",
          fillColor: "#3b82f6",
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(mapRef.current);
      } else {
        userMarkerRef.current.setLatLng([lat, lng]);
      }

      mapRef.current.setView([lat, lng], 15, { animate: true });
      evaluatePosition(lat, lng, 3);
      return undefined;
    }

    if (!("geolocation" in navigator)) {
      setErrorMessage(
        (prev) => prev || "Geolocation is not supported on this device.",
      );
      return undefined;
    }

    const onSuccess = (position) => {
      const lat = Number(position?.coords?.latitude);
      const lng = Number(position?.coords?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      setUserPosition([lat, lng]);
      setErrorMessage((prev) =>
        prev ===
        "Location permission denied. Enable location access to track geofence alerts."
          ? ""
          : prev,
      );

      if (!userPickedCityRef.current && cities.length > 0) {
        const nearest = cities.reduce((best, city) => {
          if (!Array.isArray(city.center) || city.key === "nagpur-demo")
            return best;
          const dist = squaredDistance([lat, lng], city.center);
          if (!best || dist < best.dist) return { key: city.key, dist };
          return best;
        }, null);

        if (nearest?.key && nearest.key !== selectedCity) {
          setSelectedCity(nearest.key);
        }
      }

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          color: "#1d4ed8",
          fillColor: "#3b82f6",
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(mapRef.current);
      } else {
        userMarkerRef.current.setLatLng([lat, lng]);
      }

      evaluatePosition(lat, lng, getCurrentHour());
    };

    const onError = (error) => {
      if (error?.code === 1) {
        setErrorMessage(
          "Location permission denied. Enable location access to track geofence alerts.",
        );
      } else if (error?.code === 2) {
        setErrorMessage("Location unavailable.");
      } else if (error?.code === 3) {
        setErrorMessage("Location request timed out.");
      } else {
        setErrorMessage("Unable to retrieve your location.");
      }

      setActiveZone(null);
      activeZoneRef.current = null;
      setLastAlertTime(null);
      lastAlertTimeRef.current = null;
      setDismissedZoneId("");
    };

    watcherIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      },
    );

    return () => {
      if (watcherIdRef.current !== null) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }
    };
  }, [zones, cities, selectedCity, isDemoMode, currentHour]);

  useEffect(() => {
    if (!isDemoMode || !activeZone) return undefined;

    const intervalMs = getDemoAlertIntervalMs();
    const timer = setInterval(() => {
      const now = Date.now();
      setLastAlertTime(now);
      lastAlertTimeRef.current = now;
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isDemoMode, activeZone]);

  useEffect(() => {
    if (!userPosition || userPosition.length !== 2) return;

    let cancelled = false;
    const cityName = resolveEmergencyCityName();
    if (!cityName) return;

    async function loadEmergencyServices() {
      setEmergencyLoading(true);
      setEmergencyError("");
      try {
        const [lat, lng] = userPosition;
        const url =
          `${api("/api/emergency")}?city=${encodeURIComponent(cityName)}` +
          `&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Emergency API failed");

        const payload = await response.json();
        if (cancelled) return;

        setEmergencyInfo({
          hospitals: Array.isArray(payload?.hospitals) ? payload.hospitals : [],
          police_stations: Array.isArray(payload?.police_stations)
            ? payload.police_stations
            : [],
        });
      } catch {
        if (!cancelled) {
          setEmergencyInfo({ hospitals: [], police_stations: [] });
          setEmergencyError("Unable to fetch nearby emergency services.");
        }
      } finally {
        if (!cancelled) setEmergencyLoading(false);
      }
    }

    loadEmergencyServices();
    return () => {
      cancelled = true;
    };
  }, [selectedCity, cities, userPosition]);

  useEffect(() => {
    if (!mapRef.current || !emergencyLayerGroupRef.current) return;

    emergencyLayerGroupRef.current.clearLayers();

    const hospitalIcon = L.divIcon({
      className: "emergency-marker hospital-marker",
      html: "H",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    const policeIcon = L.divIcon({
      className: "emergency-marker police-marker",
      html: "P",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    emergencyInfo.hospitals.forEach((item) => {
      if (
        !Number.isFinite(Number(item?.latitude)) ||
        !Number.isFinite(Number(item?.longitude))
      )
        return;
      const tooltipHtml = `<b>${item.name}</b><br/>${item.address || "Address unavailable"}<br/>${item.phone || "Contact unavailable"}`;
      L.marker([Number(item.latitude), Number(item.longitude)], {
        icon: hospitalIcon,
      })
        .bindPopup(tooltipHtml)
        .bindTooltip(tooltipHtml, {
          direction: "top",
          sticky: true,
          opacity: 0.95,
        })
        .addTo(emergencyLayerGroupRef.current);
    });

    emergencyInfo.police_stations.forEach((item) => {
      if (
        !Number.isFinite(Number(item?.latitude)) ||
        !Number.isFinite(Number(item?.longitude))
      )
        return;
      const tooltipHtml = `<b>${item.name}</b><br/>${item.address || "Address unavailable"}<br/>${item.phone || "Contact unavailable"}`;
      L.marker([Number(item.latitude), Number(item.longitude)], {
        icon: policeIcon,
      })
        .bindPopup(tooltipHtml)
        .bindTooltip(tooltipHtml, {
          direction: "top",
          sticky: true,
          opacity: 0.95,
        })
        .addTo(emergencyLayerGroupRef.current);
    });
  }, [emergencyInfo]);

  const statusType = activeZone?.type || "safe";
  const statusDetails = isDemoMode
    ? "Time: 3:00 AM (Simulated)"
    : activeZone
      ? `${activeZone.name} | ${new Date().toLocaleTimeString()}`
      : `Time: ${new Date().toLocaleTimeString()}`;

  const canShowActiveBanner = !activeZone || dismissedZoneId !== activeZone.id;
  const warningNode =
    canShowActiveBanner &&
    h(Banner, {
      statusType,
      details: statusDetails,
      onDismiss:
        activeZone && !isDemoMode
          ? () => setDismissedZoneId(activeZone.id)
          : undefined,
      demoMode: isDemoMode,
      zoneName: activeZone?.name || "",
    });

  const legendNode = h("div", { className: "glass-card legend" }, [
    h("div", { key: "r" }, "Restricted"),
    h("div", { key: "h" }, "High Crime"),
    h("div", { key: "t" }, "Night Risk"),
  ]);

  const cityOptions = cities.some((city) => city.key === "nagpur-demo")
    ? cities
    : [
        ...cities,
        {
          key: "nagpur-demo",
          city: "Nagpur (Demo Alert Mode)",
          center: NAGPUR_CENTER,
          zoneCount: 3,
        },
      ];

  const liveText = userPosition
    ? `Live location: ${userPosition[0].toFixed(5)}, ${userPosition[1].toFixed(5)}${isDemoMode ? " (simulated)" : ""}`
    : "Allow location access to enable live geofence alerts.";
  const emergencyCityName = resolveEmergencyCityName();

  return h("div", { style: { position: "relative" } }, [
    h("div", { key: "city-row", className: "city-toolbar" }, [
      h(
        "label",
        { key: "label", className: "city-label", htmlFor: "citySelect" },
        "City",
      ),
      h(
        "select",
        {
          key: "select",
          id: "citySelect",
          className: "city-select",
          value: selectedCity,
          onChange: (e) => {
            userPickedCityRef.current = true;
            setSelectedCity(e.target.value);
          },
        },
        cityOptions.map((city) => {
          const optionLabel =
            city.key === "nagpur-demo"
              ? "Nagpur (Demo Alert Mode)"
              : `${city.city} (${city.zoneCount})`;
          return h("option", { key: city.key, value: city.key }, optionLabel);
        }),
      ),
      isDemoMode
        ? h(
            "button",
            {
              key: "exit-demo",
              className: "pill-btn demo-exit-btn",
              onClick: () => {
                setSelectedCity("nagpur");
                setIsDemoMode(false);
                userPickedCityRef.current = false;
                setDismissedZoneId("");
              },
            },
            "Exit Demo Mode",
          )
        : null,
    ]),
    isDemoMode
      ? h("div", { key: "demo-badge-row", className: "demo-badge-row" }, [
          h(
            "div",
            { key: "demo-badge", className: "demo-badge" },
            "\u{1F534} DEMO ALERT SIMULATION ACTIVE",
          ),
        ])
      : null,
    h(
      AnimatePresence,
      { key: "banner-presence", mode: "wait" },
      h(
        motion.div,
        {
          key: statusType + String(isDemoMode),
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        },
        warningNode,
      ),
    ),
    h("div", { key: "geo-layout", className: "geo-layout" }, [
      h("div", { key: "map-shell", className: "geo-shell" }, [
        legendNode,
        h("div", { key: "map", ref: mapContainerRef, className: "geo-map" }),
        h("div", { key: "map-overlay", className: "map-overlay" }),
        h(
          "button",
          {
            key: "mobile-emergency-btn",
            type: "button",
            className: "pill-btn emergency-map-toggle",
            onClick: () => setShowEmergencySidebar((v) => !v),
          },
          showEmergencySidebar ? "Hide Nearby Services" : "Nearby Services",
        ),
        h(EmergencySidebar, {
          key: "emergency-sidebar-mobile",
          className: "emergency-sidebar-mobile",
          open: showEmergencySidebar,
          loading: emergencyLoading,
          error: emergencyError,
          cityName: emergencyCityName,
          hospitals: emergencyInfo.hospitals,
          policeStations: emergencyInfo.police_stations,
          nearestHospital: nearestServices.nearestHospital,
          nearestPolice: nearestServices.nearestPolice,
        }),
        h(
          AnimatePresence,
          { key: "zone-popup-presence" },
          selectedZone
            ? h(ZonePopup, {
                key: selectedZone.id,
                zone: selectedZone,
                onClose: () => setSelectedZone(null),
              })
            : null,
        ),
      ]),
      h(EmergencySidebar, {
        key: "emergency-sidebar-desktop",
        className: "emergency-sidebar-desktop",
        open: true,
        loading: emergencyLoading,
        error: emergencyError,
        cityName: emergencyCityName,
        hospitals: emergencyInfo.hospitals,
        policeStations: emergencyInfo.police_stations,
        nearestHospital: nearestServices.nearestHospital,
        nearestPolice: nearestServices.nearestPolice,
      }),
    ]),
    errorMessage
      ? h("p", { key: "error", className: "geo-meta" }, errorMessage)
      : null,
    h("p", { key: "live", className: "geo-meta" }, liveText),
    activeZone && lastAlertTime
      ? h(
          "p",
          { key: "last", className: "geo-meta" },
          `Last warning update: ${new Date(lastAlertTime).toLocaleTimeString()}${isDemoMode ? " (demo repeat)" : ""}`,
        )
      : null,
  ]);
}
