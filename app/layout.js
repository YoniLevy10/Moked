import "./globals.css";

export const metadata = {
  title: "מוקד — מערכת תפעול",
  description: "שכבת תפעול לעסקים בוואטסאפ. אוטומטי בשגרה. אנושי בהחלטות.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
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
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div className="brand">
              <img src="/brand/moked-mark-green.png" alt="מוקד" width={36} height={36} />
              <img
                src="/brand/moked-logo-wordmark.png"
                alt="MOKED"
                height={28}
                style={{ height: 28, width: "auto" }}
              />
            </div>
            <nav className="nav">
              <a href="/">סימולציה</a>
              <a href="/onboarding">חיבור עסק</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
