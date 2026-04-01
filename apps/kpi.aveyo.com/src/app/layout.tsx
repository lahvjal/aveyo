import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "Aveyo KPI Dashboard",
  description: "Executive dashboard for tracking key performance indicators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

