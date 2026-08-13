import "./globals.css";

export const metadata = {
  title: "מוקד — שכבת תפעול בוואטסאפ",
  description:
    "אוטומטי בשגרה. אנושי בהחלטות. 7 תהליכים סגורים לעסקים קטנים בוואטסאפ — לא צ׳אטבוט.",
  icons: {
    icon: "/moked-logo.svg",
    apple: "/moked-mark.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
