import "./globals.css";
import AvaWidgetEmbed from "./AvaWidgetEmbed";
import RouteLoadingOverlay from "./route-loading-overlay";



export const metadata = {
  title: "Aveyo Platform Dashboard",
  description: "Shared dashboard for navigating Aveyo platform apps."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RouteLoadingOverlay />
        {children}
        <AvaWidgetEmbed />
      </body>
    </html>
  );
}
