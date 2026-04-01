import "./globals.css";

export const metadata = {
  title: "Auth | Aveyo",
  description: "Shared authentication entrypoint for Aveyo apps."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
