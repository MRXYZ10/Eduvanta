import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ToastProvider } from "@/components/ui/Toast";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "500", "600"] });
const sans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "EduVanta AI",
  description: "Your AI knows what you should learn next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the theme cookie server-side and applying the class here
  // (rather than only client-side after mount) avoids a flash of the
  // wrong theme on first paint — the HTML arrives already in the
  // preferred mode instead of light-then-flip.
  const theme = cookies().get("theme")?.value;
  const isDark = theme === "dark";

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${isDark ? "dark" : ""}`}>
      <body className="bg-paper text-ink font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

