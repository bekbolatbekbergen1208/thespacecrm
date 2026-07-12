import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617 0%, #071426 48%, #020617 100%)",
          color: "white",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 800, color: "#67e8f9" }}>CRM.Space</div>
        <div style={{ marginTop: 34, maxWidth: 860, fontSize: 82, fontWeight: 900, lineHeight: 0.95 }}>
          Manage Your Entire Business From Your Phone
        </div>
        <div style={{ marginTop: 34, maxWidth: 780, fontSize: 28, lineHeight: 1.35, color: "#cbd5e1" }}>
          Customers, employees, tasks, inventory, finances, analytics, and AI automation in one platform.
        </div>
      </div>
    ),
    size,
  );
}
