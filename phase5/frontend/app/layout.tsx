import type { Metadata } from "next";
import "./globals.css";
import ChatBot from "@/components/ChatBot";

export const metadata: Metadata = {
  title: "IDSS — Retail Churn Predictor",
  description:
    "Intelligent Decision Support System for customer churn prediction and retention strategy.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
