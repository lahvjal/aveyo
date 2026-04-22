import type { Metadata } from "next";
import "./globals.css";
import AvaWidgetEmbed from "@/components/AvaWidgetEmbed";
import { SiteLoadOverlay } from "@/components/site-load-overlay";
import { metadataBase, siteDescription, siteName, siteTitle } from "@/lib/site-metadata";

const socialPreviewImage = {
  url: "/twitter-image",
  width: 1200,
  height: 630,
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
        <SiteLoadOverlay />
        {children}
        <AvaWidgetEmbed />
      </body>
    </html>
  );
}
