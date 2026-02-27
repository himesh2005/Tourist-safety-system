import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GeofenceMap from "../components/GeofenceMap";

export default function Dashboard() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [card, setCard] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return nav("/auth");

    // basic identity
    fetch("/me", { headers: { Authorization: "Bearer " + token } })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => nav("/auth"));

    // QR + scan link
    setMsg("Loading your QR...");
    fetch("/my-card", { headers: { Authorization: "Bearer " + token } })
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

  const verifyApiLink = me?.blockchainId ? `http://localhost:5000/api/verify/${me.blockchainId}` : "";

  return (
    <div style={wrap}>
      <h2>Dashboard</h2>

      <div style={cardStyle}>
        <h3>Blockchain ID Card</h3>
        <p><b>User:</b> {me?.username || "..."}</p>
        <p><b>Blockchain ID:</b> {me?.blockchainId || "..."}</p>

        {msg && <p style={{ opacity: 0.7 }}>{msg}</p>}

        {card && (
          <>
            <p>
              <b>Scan Link:</b>{" "}
              <a href={card.scanUrl} target="_blank" rel="noreferrer">
                {card.scanUrl}
              </a>
            </p>

            <img
              src={card.qrDataUrl}
              alt="QR"
              style={{ maxWidth: 240, border: "1px solid #eee", borderRadius: 10 }}
            />

            <p style={{ marginTop: 10 }}>
              <b>Proof API:</b>{" "}
              <a href={verifyApiLink} target="_blank" rel="noreferrer">
                {verifyApiLink}
              </a>
            </p>
          </>
        )}
      </div>

      <GeofenceMap />

      <button style={btn} onClick={logout}>Logout</button>
    </div>
  );
}

const wrap = { maxWidth: 720, margin: "40px auto", padding: "0 16px", fontFamily: "Arial" };
const cardStyle = { border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff", cursor: "pointer" };
