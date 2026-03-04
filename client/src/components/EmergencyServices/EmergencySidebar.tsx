import { AnimatePresence, motion } from "framer-motion";
import ServiceCard from "./ServiceCard.tsx";

export default function EmergencySidebar({
  open,
  loading,
  error,
  cityName,
  hospitals = [],
  policeStations = [],
  nearestHospital = null,
  nearestPolice = null,
  className = "",
}) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.aside
          className={`glass-card emergency-services-sidebar ${className}`.trim()}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <p className="emergency-services-title">Nearby Emergency Services</p>
          <p className="emergency-services-city">{cityName || "Detecting city..."}</p>

          {loading ? <p className="emergency-services-state">Loading nearby services...</p> : null}
          {error ? <p className="emergency-services-state emergency-services-error">{error}</p> : null}

          {!loading && !error ? (
            <>
              <section className="service-section">
                <p className="service-section-title">Hospitals</p>
                {hospitals.length === 0 ? <p className="emergency-services-state">No hospital entries available.</p> : null}
                {hospitals.map((service) => (
                  <ServiceCard
                    key={`h-${service.name}-${service.phone || "na"}`}
                    type="hospital"
                    service={service}
                    isNearest={Boolean(nearestHospital && nearestHospital.name === service.name)}
                  />
                ))}
              </section>

              <section className="service-section">
                <p className="service-section-title">Police Stations</p>
                {policeStations.length === 0 ? <p className="emergency-services-state">No police entries available.</p> : null}
                {policeStations.map((service) => (
                  <ServiceCard
                    key={`p-${service.name}-${service.phone || "na"}`}
                    type="police"
                    service={service}
                    isNearest={Boolean(nearestPolice && nearestPolice.name === service.name)}
                  />
                ))}
              </section>
            </>
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

