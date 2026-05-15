import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeDocAI - Intelligent Trade Document Extraction",
  description: "Transform trade documents with AI-powered extraction, analysis, and form generation. Streamline your document management workflow.",
  keywords: ["trade documents", "document extraction", "AI forms", "PDF processing"],
  openGraph: {
    title: "TradeDocAI - Intelligent Trade Document Extraction",
    description: "Transform trade documents with AI-powered extraction and analysis.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeDocAI - Intelligent Trade Document Extraction",
    description: "Transform trade documents with AI-powered extraction, analysis, and form generation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dmSerifDisplay.variable} ${dmSans.variable} h-full antialiased bg-background`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}