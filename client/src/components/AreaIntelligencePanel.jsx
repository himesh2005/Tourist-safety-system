import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronDown, FiChevronUp, FiMoon, FiShield, FiTarget } from "react-icons/fi";

export default function AreaIntelligencePanel() {
  const [open, setOpen] = useState(true);

  return (
    <section className="glass-card panel">
      <div className="panel-head">
        <h3 className="panel-title">Area Intelligence Guide</h3>
        <button className="pill-btn panel-toggle" onClick={() => setOpen((v) => !v)} aria-label="Toggle panel">
          {open ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="risk-items"
          >
            <div className="risk-item glow-restricted">
              <h4>
                <FiShield /> Restricted Zones (Always Avoid)
              </h4>
              <p>Operational or structural hazard zones. Enter only if authorized.</p>
            </div>
            <div className="risk-item glow-high_crime">
              <h4>
                <FiTarget /> High Crime Zones (Stay Alert)
              </h4>
              <p>Higher incident density. Avoid isolated routes and keep contacts ready.</p>
            </div>
            <div className="risk-item glow-time_based">
              <h4>
                <FiMoon /> Night Risk Zones (Avoid 2 AM - 6 AM)
              </h4>
              <p>Risk elevates in configured night windows. Exit early when possible.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
