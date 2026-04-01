import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ava Rep Dashboard",
  description: "Representative dashboard scaffold for Ava"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
