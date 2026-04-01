import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ava API",
  description: "Ava API and realtime scaffold"
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
