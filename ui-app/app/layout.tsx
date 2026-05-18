import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeDocAI - Intelligent Trade Document Extraction",
  description: "Transform trade documents with AI-powered extraction, analysis, and form generation. Streamline your document management workflow.",
  keywords: ["trade documents", "document extraction", "AI forms", "PDF processing"],
  icons: {
    icon: "/logo-light.svg",
    shortcut: "/logo-light.svg",
    apple: "/logo-light.svg",
  },
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
      className="h-full antialiased bg-background"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
