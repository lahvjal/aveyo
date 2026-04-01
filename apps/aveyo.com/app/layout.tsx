import type { Metadata } from "next";
import "./globals.css";
import AvaWidgetEmbed from "@/components/AvaWidgetEmbed";

export const metadata: Metadata = {
  title: "Aveyo Solar | Power What Matters Most",
  description: "Go solar with Aveyo. Spend less on power, spend more on life. Get a free quote today.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <AvaWidgetEmbed />
      </body>
    </html>
  );
}
