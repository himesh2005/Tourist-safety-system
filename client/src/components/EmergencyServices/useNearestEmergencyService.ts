import { useMemo } from "react";

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function nearestEntry(lat, lng, list) {
  const valid = list.filter(
    (item) => Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude))
  );
  if (valid.length === 0) return null;

  return valid
    .map((item) => ({
      item,
      dist: haversineKm(lat, lng, Number(item.latitude), Number(item.longitude)),
    }))
    .sort((a, b) => a.dist - b.dist)[0]?.item || null;
}

export function useNearestEmergencyService(userPosition, hospitals = [], policeStations = [], enabled = false) {
  return useMemo(() => {
    if (!enabled || !Array.isArray(userPosition) || userPosition.length !== 2) {
      return { nearestHospital: null, nearestPolice: null };
    }

    const [lat, lng] = userPosition;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return { nearestHospital: null, nearestPolice: null };
    }

    return {
      nearestHospital: nearestEntry(Number(lat), Number(lng), hospitals),
      nearestPolice: nearestEntry(Number(lat), Number(lng), policeStations),
    };
  }, [enabled, hospitals, policeStations, userPosition]);
}

