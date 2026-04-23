import type { Metadata } from "next";
import "./globals.css";
import AvaWidgetEmbed from "@/components/AvaWidgetEmbed";
import { SiteLoadOverlay } from "@/components/site-load-overlay";
import { metadataBase, siteDescription, siteName, siteTitle } from "@/lib/site-metadata";

const socialPreviewImage = {
  url: "/images/og-preview-bg.jpg",
  width: 1600,
  height: 900,
  alt: "Aveyo Solar social preview"
};

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
    description: siteDescription,
    images: [socialPreviewImage]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [socialPreviewImage]
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
        <noscript>
          <style>{`.viewport-reveal{opacity:1!important;transform:none!important;}`}</style>
        </noscript>
        <SiteLoadOverlay />
        {children}
        <AvaWidgetEmbed />
      </body>
    </html>
  );
}
