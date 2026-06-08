import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CustomCursor } from "./components/CustomCursor";
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

export const metadata: Metadata = {
  metadataBase: new URL('https://anshul.ai'),
  verification: {
    google: 'PLACEHOLDER_VERIFICATION_CODE',
  },
  title: {
    default: 'Anshul Gupta — AI Builder & Educator',
    template: '%s | Anshul Gupta',
  },
  description: 'GTM Strategy at Google. Kellogg MBA. I build AI products and teach practical AI to business professionals. No engineering background required.',
  openGraph: {
    title: 'Anshul Gupta | AI Strategy & GTM Leader',
    description: 'Building AI tools and strategies for business professionals',
    url: 'https://anshul.ai',
    siteName: 'Anshul Gupta',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@anshulai',
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
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased grain`}
      >
        <CustomCursor />
        <div className="noise-overlay" />
        {children}
        <Analytics />
      </body>
    </html>
  );
}