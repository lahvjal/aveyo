import "./globals.css";
import AvaWidgetEmbed from "./AvaWidgetEmbed";
import RouteLoadingOverlay from "./route-loading-overlay";
import { authStyleVars } from "../lib/auth-design-system";

export const metadata = {
  title: "Auth | Aveyo",
  description: "Shared authentication entrypoint for Aveyo apps."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={authStyleVars}>
        <RouteLoadingOverlay />
        {children}
        <AvaWidgetEmbed />
      </body>
    </html>
  );
}
