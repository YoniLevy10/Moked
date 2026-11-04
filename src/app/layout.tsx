import type { Metadata, Viewport } from "next";
import { Heebo, Rubik } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["500", "600", "700", "800"],
});

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
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${rubik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
