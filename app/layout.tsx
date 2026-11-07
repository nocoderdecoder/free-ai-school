import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://anshul.ai"),
  title: {
    default: "Anshul Gupta | Applied AI & GTM Strategy",
    template: "%s | Anshul Gupta",
  },
  description:
    "Applied AI, commercial strategy, and execution. Explore independent demonstrations and practical guides by Anshul Gupta, a Google strategy and operations professional and Kellogg MBA.",
  openGraph: {
    title: "Anshul Gupta | Applied AI & GTM Strategy",
    description: "Building AI tools and strategies for business professionals",
    url: "https://anshul.ai",
    siteName: "Anshul Gupta",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${dmSans.variable} h-full antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
