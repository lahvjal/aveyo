import type { Metadata } from "next";
import RouteLoadingOverlay from "./route-loading-overlay";

export const metadata: Metadata = {
  title: "Ava API",
  description: "Ava API and realtime scaffold"
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
