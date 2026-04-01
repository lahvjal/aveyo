import "./globals.css";
// import AvaWidgetEmbed from "@/components/AvaWidgetEmbed";



export const metadata = {
  title: "Aveyo Platform Dashboard",
  description: "Shared dashboard for navigating Aveyo platform apps."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}
        {/* <AvaWidgetEmbed /> */}
      </body>
    </html>
  );
}
