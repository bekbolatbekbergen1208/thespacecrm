"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
export function QrScanner({
  onScan,
}: {
  onScan: (token: string) => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null),
    callback = useRef(onScan),
    [active, setActive] = useState(false),
    [error, setError] = useState("");
  callback.current = onScan;
  useEffect(() => {
    if (!active || !video.current) return;
    let disposed = false,
      controls: IScannerControls | undefined,
      busy = false,
      last = "",
      lastAt = 0;
    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromVideoDevice(undefined, video.current, async (result) => {
        if (disposed || !result || busy) return;
        const token = result.getText();
        if (token === last && Date.now() - lastAt < 4000) return;
        busy = true;
        last = token;
        lastAt = Date.now();
        try {
          await callback.current(token);
        } finally {
          busy = false;
        }
      })
      .then((c) => {
        if (disposed) c.stop();
        else controls = c;
      })
      .catch(() => {
        if (!disposed) {
          setError(
            "Камера ашылмады. Рұқсатты тексеріңіз немесе QR кодты төмендегі өріске енгізіңіз.",
          );
          setActive(false);
        }
      });
    return () => {
      disposed = true;
      controls?.stop();
    };
  }, [active]);
  return (
    <div className="scanner">
      <div className="scanner-viewport">
        {active ? (
          <video ref={video} muted playsInline />
        ) : (
          <div className="scan-placeholder">
            <span>▦</span>
            <strong>QR бейджді камераға көрсетіңіз</strong>
            <p>Оқушы дұрыс топта болса, қатысуы бірден белгіленеді.</p>
          </div>
        )}
        {active && <div className="scan-guide" />}
      </div>
      <button
        className={active ? "secondary" : "primary"}
        onClick={() => {
          setError("");
          setActive(!active);
        }}
      >
        {active ? "Камераны тоқтату" : "Камераны қосу"}
      </button>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = e.currentTarget;
          const token = String(new FormData(f).get("token"));
          await callback.current(token);
          f.reset();
        }}
      >
        <label>
          USB сканер немесе QR мәтіні
          <input name="token" placeholder="s7:…" required maxLength={500} />
        </label>
        <button className="secondary">Қатысуды белгілеу</button>
      </form>
    </div>
  );
}
