import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatUp",
  description: "Chat with random people instantly — no sign up needed",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ChatUp",
  },
};

export const viewport: Viewport = {
  themeColor: "#6d28d9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={geist.className}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
