import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מוקד — מכל שיחה לתוצאה עסקית",
  description:
    "מוקד הופכת שיחות WhatsApp לתהליך תפעולי מסודר: קליטת פניות, תיאום, תזכורות, הצעות מחיר ומעקב — במקום אחד.",
  applicationName: "מוקד",
  keywords: ["מוקד", "ניהול פניות", "מערכת תפעול לעסקים", "WhatsApp לעסקים"],
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "מוקד",
    title: "מוקד — מכל שיחה לתוצאה עסקית",
    description:
      "מערכת תפעול עסקית שמחברת שיחות WhatsApp לפניות, תיאומים והמשך טיפול.",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#087a55",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Runtime Google Fonts (not next/font/google): Vercel builds fail when the
  // Google CSS endpoint returns an empty body and next/font crashes parsing it.
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&family=Rubik:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
