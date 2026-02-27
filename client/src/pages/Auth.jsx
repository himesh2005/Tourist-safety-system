import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Auth() {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [msg, setMsg] = useState("");

  async function login(e) {
    e.preventDefault();
    setMsg("Logging in...");

    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("blockchainId", data.blockchainId);
    setMsg("Success ✅");
    nav("/dashboard");
  }

  return (
    <div style={wrap}>
      <h2>Traveller Safety — Login</h2>

      <form onSubmit={login} style={card}>
        <input
          style={inp}
          placeholder="username"
          value={username}
          onChange={(e) => setU(e.target.value)}
        />
        <input
          style={inp}
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setP(e.target.value)}
        />
        <button style={btn}>Login</button>
        <div style={{ marginTop: 10 }}>{msg}</div>
      </form>

      <p style={{ marginTop: 10 }}>
  New user? <Link to="/register" style={{ color: "blue" }}>Create account</Link>
</p>

<button
  type="button"
  onClick={() => nav("/register")}
  style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid #333", background: "#fff", cursor: "pointer" }}
>
  Create account
</button>

    </div>
  );
}

const wrap = { maxWidth: 520, margin: "40px auto", padding: "0 16px", fontFamily: "Arial" };
const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16 };
const inp = { width: "100%", padding: 10, margin: "6px 0", borderRadius: 10, border: "1px solid #ccc" };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff", cursor: "pointer" };
