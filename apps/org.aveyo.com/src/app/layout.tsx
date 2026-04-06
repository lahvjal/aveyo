import type { Metadata } from "next";
import "../index.css";
import { Providers } from "./providers";
import AvaWidgetEmbed from "@/components/AvaWidgetEmbed";

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
        <Providers>
          {children}
          <AvaWidgetEmbed />
        </Providers>
      </body>
    </html>
  );
}
