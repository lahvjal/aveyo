import type { Metadata } from "next";
import "./globals.css";
import AvaWidgetEmbed from "@/components/ava-widget-embed";
import RouteLoadingOverlay from "./route-loading-overlay";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Ava Rep Dashboard",
  description: "Representative dashboard scaffold for Ava"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RouteLoadingOverlay />
        {children}
        <AvaWidgetEmbed />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
