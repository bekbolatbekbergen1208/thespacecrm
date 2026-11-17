import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  applicationName: "S7 Robotics",
  title: "S7 Robotics · Жеке CRM",
  description:
    "S7 Robotics оқу орталығының жеке CRM жүйесі: оқушылар, QR қатысу, қызметкерлер, сабақ әдістемелері және төлемдер.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "S7 Robotics · Жеке CRM",
    description: "S7 Robotics оқу орталығының жеке жұмыс кеңістігі.",
    type: "website",
    siteName: "S7 Robotics",
  },
  twitter: {
    card: "summary",
    title: "S7 Robotics · Жеке CRM",
    description: "Оқу орталығының жеке жұмыс кеңістігі.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="kk">
      <body className="noise font-sans antialiased">{children}</body>
    </html>
  );
}
