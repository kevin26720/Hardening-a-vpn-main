import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SECURE ACCESS GATEWAY - SYSTEM PORTAL",
  description: "Secure mainframe access node. Authorized personnel only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="crt-flicker">
        <div className="grid-bg" />
        <div className="scanline-bar" />
        {children}
      </body>
    </html>
  );
}
