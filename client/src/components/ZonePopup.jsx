import { motion } from "framer-motion";

function contentByType(type) {
  if (type === "restricted") {
    return {
      title: "\uD83D\uDEAB Restricted Area",
      points: [
        "Officially restricted for safety reasons",
        "Unauthorized entry may be unsafe",
        "Follow administrative guidelines",
      ],
      emergency: "Remain in well-lit public areas.",
    };
  }

  if (type === "high_crime") {
    return {
      title: "\u26A0 High Crime Area",
      points: [
        "Reported higher incident activity",
        "Avoid isolated movement",
        "Stay alert in crowded junctions",
      ],
      emergency: "Stay near active public spots and keep emergency contacts ready.",
    };
  }

  return {
    title: "\uD83C\uDF19 Night Risk Zone",
    points: [
      "Risk increases during configured hours",
      "Avoid staying in this zone late night",
      "Plan safer routes before high-risk window",
    ],
    emergency: "Exit toward a lit arterial road and share your live location.",
  };
}

export default function ZonePopup({ zone, onClose }) {
  if (!zone) return null;
  const content = contentByType(zone.type);

  return (
    <motion.div
      className={`zone-popup-card glow-${zone.type}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="zone-popup-head">
        <h4>{content.title}</h4>
        <button className="zone-close" onClick={onClose} aria-label="Close zone popup">
          X
        </button>
      </div>

      <ul>
        {content.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="zone-badge">Risk Level: {String(zone.riskLevel || "").toUpperCase()}</div>
      {zone.type === "time_based" && zone.activeHours ? (
        <p className="zone-safe-hours">
          Safe hours: Outside {zone.activeHours.start}:00 - {zone.activeHours.end}:00
        </p>
      ) : null}
      <p className="zone-emergency">Emergency Suggestion: {content.emergency}</p>
    </motion.div>
  );
}
