"use client";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import "./center.css";
import "./crm.css";
import "./glass.css";
import { BrandMark } from "./brand-mark";
export function CenterLogin() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  return (
    <main
      lang="kk"
      className="center-app login-page login-redesign login-enterprise"
    >
      <section className="login-form-side">
        <div className="login-access-label">
          <ShieldCheck size={15} />
          Жеке жұмыс кеңістігі
        </div>
        <div className="login-card">
          <div className="center-logo">
            <BrandMark />
          </div>
          <p className="eyebrow">S7 ROBOTICS · ЖЕКЕ CRM</p>
          <h2>Жүйеге кіру</h2>
          <p className="login-intro">
            Жұмыс кабинетіне кіру үшін аккаунтыңызды қолданыңыз.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                const r = await fetch("/api/center", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "login",
                    email: f.get("email"),
                    password: f.get("password"),
                  }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                window.location.assign("/workspace");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="s7-email">
              Email / логин
              <input
                id="s7-email"
                name="email"
                type="email"
                placeholder="Мысалы, admin1@s7.local"
                required
                autoComplete="username"
                disabled={busy}
                spellCheck={false}
                autoCapitalize="none"
              />
            </label>
            <label htmlFor="s7-password">
              Құпиясөз
              <div className="login-password">
                <input
                  id="s7-password"
                  name="password"
                  type={visible ? "text" : "password"}
                  placeholder="Құпиясөзіңізді енгізіңіз"
                  required
                  autoComplete="current-password"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={
                    visible ? "Құпиясөзді жасыру" : "Құпиясөзді көрсету"
                  }
                  aria-pressed={visible}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <div role="alert" className="login-error">
                {error}
              </div>
            )}
            <button className="primary login-submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle size={18} className="login-spin" />
                  Кіру орындалуда…
                </>
              ) : (
                <>
                  Кабинетке кіру
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="login-help">
            <Users size={17} />
            <p>
              Аккаунтты орталық әкімшісі береді.
              <br />
              <span>Кіруде қиындық болса, әкімшіге хабарласыңыз.</span>
            </p>
          </div>
          <div className="login-roles">
            <span>Әкімші</span>
            <i />
            <span>Ментор</span>
            <ShieldCheck size={14} />
          </div>
        </div>
        <p className="login-bottom-note">
          S7 Robotics · Орталықтың жеке CRM жүйесі
        </p>
      </section>
    </main>
  );
}
