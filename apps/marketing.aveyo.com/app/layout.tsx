import type { Metadata } from "next";
import "./globals.css";
import RouteLoadingOverlay from "./route-loading-overlay";

export const metadata: Metadata = {
  title: "Aveyo Marketing",
  description: "Marketing request and culture events workspace."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RouteLoadingOverlay />
        {children}
      </body>
    </html>
  );
}
