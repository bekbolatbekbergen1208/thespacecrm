"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
export function BrandingSettings({ onSaved }: { onSaved: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <section className="panel branding-settings">
      <div className="panel-heading">
        <h2>S7 Robotics · Орталықтың логотипі</h2>
        <span className="tag">ЖЕКЕ CRM</span>
      </div>
      <div className="branding-settings-body">
        <p className="muted">
          Түпнұсқа логотипті жүктеңіз. Ол кіру бетінде, мәзірде және оқушылардың
          QR бейдждерінде бірдей көрсетіледі.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const file = new FormData(e.currentTarget).get("logo");
            setError("");
            setMessage("");
            if (!(file instanceof File) || !file.size) {
              setError("Логотип суретін таңдаңыз");
              return;
            }
            if (file.size > 2 * 1024 * 1024) {
              setError("Логотип 2 МБ-тан аспауы керек");
              return;
            }
            setBusy(true);
            try {
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(Error("Файл оқылмады"));
                reader.readAsDataURL(file);
              });
              const r = await fetch("/api/center/brand", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dataUrl }),
              });
              const data = await r.json();
              if (!r.ok) throw Error(data.error);
              setMessage(data.message);
              onSaved();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            PNG, JPG немесе WebP · 2 МБ
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              disabled={busy}
            />
          </label>
          <button className="secondary" disabled={busy}>
            <Upload size={15} />
            {busy ? "Жүктелуде…" : "Логотипті сақтау"}
          </button>
        </form>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="branding-confirmation" role="status">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
