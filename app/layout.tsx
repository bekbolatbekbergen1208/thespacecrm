import type { Metadata } from "next";
import { getServerLocale } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crm.space"),
  applicationName: "CRM.Space",
  title: "CRM.Space | Manage Your Entire Business From Your Phone",
  description:
    "CRM.Space brings customers, employees, finances, inventory, analytics, and AI together in one mobile-first business operating system.",
  authors: [{ name: "Bekbergen Bekbolat" }],
  creator: "Bekbergen Bekbolat",
  publisher: "Bekbergen Bekbolat",
  keywords: [
    "CRM.Space",
    "mobile CRM",
    "business operating system",
    "employee management",
    "inventory management",
    "AI business assistant",
    "small business CRM"
  ],
  openGraph: {
    title: "CRM.Space | Mobile-first CRM and Business OS",
    description:
      "Run customers, employees, tasks, inventory, finance, analytics, and AI automation from one smartphone-first platform.",
    url: "https://crm.space",
    type: "website",
    siteName: "CRM.Space",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CRM.Space" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CRM.Space",
    description: "Manage your entire business from your phone.",
    images: ["/opengraph-image"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CRM.Space",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    author: { "@type": "Person", name: "Bekbergen Bekbolat" },
    creator: { "@type": "Person", name: "Bekbergen Bekbolat" },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free Plan" },
    description:
      "CRM.Space helps businesses manage customers, employees, tasks, inventory, finances, analytics, and AI automation from a single platform.",
  };

  return (
    <html lang={locale}>
      <body className="noise font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
