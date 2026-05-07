import { DM_Sans } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata = {
  title: {
    default: "Eventmaster",
    template: "%s · Eventmaster",
  },
  description: "Discover and purchase entry to your next memorable experience.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
