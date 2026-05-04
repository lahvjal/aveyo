import type { Metadata } from "next";
import "../index.css";
import { Providers } from "./providers";
import AvaWidgetEmbed from "@/components/AvaWidgetEmbed";
import RouteLoadingOverlay from "./route-loading-overlay";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Aveyo OrgChart",
  description: "Aveyo organizational chart app"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RouteLoadingOverlay />
        <Providers>
          {children}
          <AvaWidgetEmbed />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
