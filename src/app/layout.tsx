import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Nav } from "@/widgets/nav";

export const metadata: Metadata = {
  title: "QNB Expenses",
  description: "AI-powered personal expense intelligence for QNB credit cards.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "QNB Expenses",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen pb-28 md:pb-0 md:pl-60">
          <Nav />
          <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-10 sm:px-6 md:pt-12 md:pb-16">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
