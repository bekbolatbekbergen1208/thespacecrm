import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "S7 Robotics · Оқу орталығы",
  description: "Оқушылар, QR қатысу, қызметкерлер, әдістемелер және төлемдер.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
