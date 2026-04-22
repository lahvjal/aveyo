import type { Metadata } from "next";
import "./globals.css";
import AvaWidgetEmbed from "@/components/AvaWidgetEmbed";
import { SiteLoadOverlay } from "@/components/site-load-overlay";
import { metadataBase, siteDescription, siteName, siteTitle } from "@/lib/site-metadata";

export const metadata: Metadata = {
  metadataBase,
  title: siteTitle,
  description: siteDescription,
  applicationName: siteName,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: siteTitle,
    description: siteDescription
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteLoadOverlay />
        {children}
        <AvaWidgetEmbed />
      </body>
    </html>
  );
}
