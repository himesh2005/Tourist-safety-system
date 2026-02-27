import { createElement as h, useEffect, useRef, useState } from "react";
import L from "leaflet";

const NAGPUR_CENTER = [21.1458, 79.0882];

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
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function normalizeZones(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((zone) => {
    if (!zone || typeof zone !== "object") return false;
    if (zone.type !== "restricted" && zone.type !== "caution") return false;
    if (!Array.isArray(zone.coordinates) || zone.coordinates.length < 3) return false;
    return zone.coordinates.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        Number.isFinite(Number(pair[0])) &&
        Number.isFinite(Number(pair[1]))
    );
  });
}

export default function GeofenceMap() {
  const [zones, setZones] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [activeRestrictedZone, setActiveRestrictedZone] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const zoneLayerGroupRef = useRef(null);
  const watcherIdRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current).setView(NAGPUR_CENTER, 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    zoneLayerGroupRef.current = L.layerGroup().addTo(map);

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
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadZones() {
      try {
        const response = await fetch("/api/zones", { cache: "no-store" });
        if (!response.ok) throw new Error("Zones fetch failed");
        const data = await response.json();
        if (cancelled) return;

        const validZones = normalizeZones(data);
        setZones(validZones);
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
  }, []);

  useEffect(() => {
    if (!mapRef.current || !zoneLayerGroupRef.current) return;

    zoneLayerGroupRef.current.clearLayers();

    zones.forEach((zone) => {
      const color = zone.type === "restricted" ? "red" : "#eab308";
      L.polygon(zone.coordinates, { color, weight: 2, fillOpacity: 0.2 })
        .bindPopup(zone.name)
        .addTo(zoneLayerGroupRef.current);
    });
  }, [zones]);

  useEffect(() => {
    if (!mapRef.current) return undefined;

    if (!("geolocation" in navigator)) {
      setErrorMessage((prev) => prev || "Geolocation is not supported on this device.");
      return undefined;
    }

    const onSuccess = (position) => {
      const lat = Number(position?.coords?.latitude);
      const lng = Number(position?.coords?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      setUserPosition([lat, lng]);
      setErrorMessage((prev) =>
        prev === "Location permission denied. Enable location access to track geofence alerts." ? "" : prev
      );

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

      const restrictedMatch = zones.find(
        (zone) => zone.type === "restricted" && isPointInPolygon([lat, lng], zone.coordinates)
      );
      setActiveRestrictedZone(restrictedMatch || null);
    };

    const onError = (error) => {
      if (error?.code === 1) {
        setErrorMessage("Location permission denied. Enable location access to track geofence alerts.");
      } else if (error?.code === 2) {
        setErrorMessage("Location unavailable.");
      } else if (error?.code === 3) {
        setErrorMessage("Location request timed out.");
      } else {
        setErrorMessage("Unable to retrieve your location.");
      }
      setActiveRestrictedZone(null);
    };

    watcherIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 5000,
    });

    return () => {
      if (watcherIdRef.current !== null) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }
    };
  }, [zones]);

  const warningNode = activeRestrictedZone
    ? h(
        "div",
        { style: warningStyle },
        h("div", { style: { fontWeight: 700 } }, "⚠ WARNING"),
        h("div", null, `You are inside restricted area: ${activeRestrictedZone.name}`)
      )
    : null;

  const errorNode = errorMessage ? h("p", { style: errorTextStyle }, errorMessage) : null;

  const liveText = userPosition
    ? `Live location: ${userPosition[0].toFixed(5)}, ${userPosition[1].toFixed(5)}`
    : "Allow location access to enable live geofence alerts.";

  return h(
    "div",
    { style: sectionStyle },
    h("h3", { style: { marginTop: 0 } }, "Nagpur Geofencing (Phase-1)"),
    warningNode,
    errorNode,
    h("div", { ref: mapContainerRef, style: mapStyle }),
    h("p", { style: helperTextStyle }, liveText)
  );
}

const sectionStyle = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const warningStyle = {
  background: "#b91c1c",
  color: "#fff",
  padding: "12px 14px",
  borderRadius: 10,
  marginBottom: 12,
  lineHeight: 1.35,
};

const errorTextStyle = {
  color: "#b91c1c",
  marginTop: 0,
  marginBottom: 10,
};

const mapStyle = {
  height: 400,
  width: "100%",
  borderRadius: 12,
  overflow: "hidden",
  marginTop: 8,
};

const helperTextStyle = {
  opacity: 0.75,
  fontSize: 13,
  marginTop: 10,
  marginBottom: 0,
};
