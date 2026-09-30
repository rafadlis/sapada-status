import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import "./status-ui.css";
import "./reference-ui.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { absoluteUrl, pageMetadata, siteDescription, siteName, siteUrl } from "@/lib/seo";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...pageMetadata(siteName, siteDescription, "/"),
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: "%s | Status Bapenda Garut" },
  applicationName: siteName,
  robots: { index: process.env.VERCEL_ENV !== "preview", follow: true },
  alternates: {
    types: { "application/rss+xml": absoluteUrl("/rss.xml") },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col"><TooltipProvider>{children}</TooltipProvider></body>
    </html>
  );
}
