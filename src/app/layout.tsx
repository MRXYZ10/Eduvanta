import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ToastProvider } from "@/components/ui/Toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "EduVanta AI",
  description: "Your AI knows what you should learn next.",
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const isDark = theme === "dark";

  return (
    <html lang="en" className={`${sans.variable} ${isDark ? "dark" : ""}`}>
      <body className="bg-paper text-ink font-sans antialiased">
        <ServiceWorkerRegistration />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}