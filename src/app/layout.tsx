import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TestBaan | تست‌بان",
  description: "سیستم هوشمند مدیریت آزمون و پاسخ‌برگ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}