import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { CursorSpotlight } from "./components/CursorSpotlight";
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
  title: "Anshul Gupta — AI Builder & Educator",
  description: "GTM Strategy at Google. Kellogg MBA. I build AI products and teach practical AI to business professionals. No engineering background required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
          <CursorSpotlight />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}