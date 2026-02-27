import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    bloodGroup: "",
    allergies: "",
    emergencyContacts: "",
    address: "",
  });
  const [msg, setMsg] = useState("");

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("Creating account...");

    const res = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setMsg(data.error || "Register failed");
      return;
    }

    setMsg("Account created ✅ Redirecting to login...");
    setTimeout(() => nav("/auth"), 1200);
  }

  return (
    <div style={wrap}>
      <h2>Traveller Safety — Register</h2>

      <form onSubmit={submit} style={card}>
        <input style={inp} placeholder="username" value={form.username} onChange={(e) => set("username", e.target.value)} />
        <input style={inp} placeholder="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
        <input style={inp} placeholder="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <input style={inp} placeholder="bloodGroup (e.g. O+)" value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} />
        <input style={inp} placeholder="allergies" value={form.allergies} onChange={(e) => set("allergies", e.target.value)} />
        <input style={inp} placeholder="emergencyContacts" value={form.emergencyContacts} onChange={(e) => set("emergencyContacts", e.target.value)} />
        <input style={inp} placeholder="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
        <button style={btn}>Create Account</button>

        <div style={{ marginTop: 10 }}>{msg}</div>
      </form>

      <p style={{ marginTop: 10 }}>
        Already have an account? <Link to="/auth">Login</Link>
      </p>
    </div>
  );
}

const wrap = { maxWidth: 520, margin: "40px auto", padding: "0 16px", fontFamily: "Arial" };
const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16 };
const inp = { width: "100%", padding: 10, margin: "6px 0", borderRadius: 10, border: "1px solid #ccc" };
const btn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff", cursor: "pointer" };
