import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaQrcode } from "react-icons/fa6";
import { FiChevronDown, FiCopy, FiLogOut, FiShield } from "react-icons/fi";
import AreaIntelligencePanel from "../components/AreaIntelligencePanel.jsx";
import GeofenceMap from "../components/GeofenceMap";
import { API_URL } from "../config/env.js";

const BASE_API_URL = String(API_URL || "http://localhost:5000").replace(
  /\/+$/,
  "",
);

export default function Dashboard() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [card, setCard] = useState(null);
  const [msg, setMsg] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return nav("/auth");

    fetch(`${BASE_API_URL}/me`, {
      headers: { Authorization: "Bearer " + token },
    })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => nav("/auth"));

    setMsg("Loading your QR...");
    fetch(`${BASE_API_URL}/my-card`, {
      headers: { Authorization: "Bearer " + token },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setMsg(d.error);
          return;
        }
        setCard(d);
        setMsg("");
      })
      .catch(() => setMsg("Failed to load QR"));
  }, [nav]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("blockchainId");
    nav("/auth");
  }

  function copyText(value) {
    if (!value) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value);
    }
  }

  const verifyApiLink = me?.blockchainId
    ? `${BASE_API_URL}/api/verify/${me.blockchainId}`
    : "";

  return (
    <div className="dashboard-screen page-container">
      <motion.nav
        className="glass-card dashboard-nav"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="brand">
          <FiShield />
          <h1>Tourist Safety System</h1>
        </div>

        <div className="nav-right">
          <button
            className="pill-btn icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open QR panel"
          >
            <FaQrcode />
          </button>
          <div className="profile-menu-wrap">
            <button
              className="pill-btn profile-trigger"
              onClick={() => setProfileOpen((v) => !v)}
            >
              {me?.username || "Profile"} <FiChevronDown />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  className="glass-card profile-menu"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <button
                    className="menu-item"
                    onClick={() => copyText(me?.blockchainId || "")}
                  >
                    <FiCopy /> Copy Blockchain ID
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => setDrawerOpen(true)}
                  >
                    <FaQrcode /> View QR
                  </button>
                  <button className="menu-item" onClick={logout}>
                    <FiLogOut /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.nav>

      <div className="dashboard-grid">
        <motion.section
          className="glass-card panel"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.05 }}
        >
          <GeofenceMap />
        </motion.section>

        <motion.aside
          className="dashboard-side-column"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.1 }}
        >
          <section className="glass-card panel">
            <h3 className="panel-title">Traveler Overview</h3>
            <div className="risk-items">
              <div className="risk-item">
                <h4>Traveler</h4>
                <p>{me?.username || "Loading..."}</p>
              </div>
              <div className="risk-item">
                <h4>Blockchain ID</h4>
                <p>{me?.blockchainId || "Pending..."}</p>
              </div>
              <div className="risk-item">
                <h4>Live Advisory</h4>
                <p>
                  Use the map and zone status banner for real-time movement
                  safety guidance.
                </p>
              </div>
            </div>
          </section>
          <AreaIntelligencePanel />
        </motion.aside>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="drawer-overlay"
              onClick={() => setDrawerOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="glass-card qr-drawer"
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <h3 className="panel-title" style={{ marginBottom: 6 }}>
                Digital Safety Card
              </h3>
              {msg && <p className="geo-meta">{msg}</p>}

              <div className="risk-item">
                <h4>Blockchain ID</h4>
                <p>{me?.blockchainId || "..."}</p>
              </div>

              {card && (
                <>
                  <div className="risk-item" style={{ marginTop: 10 }}>
                    <h4>Scan Link</h4>
                    <p>
                      <a href={card.scanUrl} target="_blank" rel="noreferrer">
                        {card.scanUrl}
                      </a>
                    </p>
                  </div>

                  <img src={card.qrDataUrl} alt="QR" className="qr-image" />

                  <div className="copy-row">
                    <button
                      className="pill-btn"
                      onClick={() => copyText(me?.blockchainId || "")}
                    >
                      <FiCopy style={{ marginRight: 6 }} />
                      Copy Blockchain ID
                    </button>
                    <button
                      className="pill-btn"
                      onClick={() => copyText(card.scanUrl || "")}
                    >
                      <FiCopy style={{ marginRight: 6 }} />
                      Copy Scan Link
                    </button>
                    <a
                      href={verifyApiLink}
                      target="_blank"
                      rel="noreferrer"
                      className="pill-btn"
                      style={linkBtn}
                    >
                      Verify Proof API
                    </a>
                  </div>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const linkBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
};
