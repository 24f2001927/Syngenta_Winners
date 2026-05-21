import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kisaan Kavach — AI Shield for Indian Agriculture",
  description: "AI-powered platform for personalized agricultural marketing and pest threat detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
