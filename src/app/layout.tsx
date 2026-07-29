import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { PageViewTracker } from "@/components/PageViewTracker";
import { SITE, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — India's First AI Footwear Platform | ${SITE.tagline}`,
    template: `%s | ${SITE.name}`
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "AI footwear platform India",
    "AI shoe recommendation",
    "perfect fit shoes online",
    "shoe size finder India",
    "foot scan shoe size",
    "compare shoe prices India",
    "virtual shoe try on",
    "find shoes from photo",
    "best running shoes India",
    "orthopedic shoes for seniors India",
    "kids school shoes online",
    "Upanah",
    "Upanah.AI",
    "Har Kadam Ka Saathi"
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "shopping",
  // Search Console / Bing ownership tokens, supplied by environment rather than
  // committed. They are per-property strings that belong to whoever owns the
  // domain, and hardcoding one in a public repo means the next person to fork this
  // is claiming ownership of somebody else's property. Set the app setting, restart,
  // and the tag appears — no code change and no redeploy.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {})
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: "/",
    siteName: SITE.name,
    title: `${SITE.name} — India's First AI Footwear Platform`,
    description: SITE.description,
    images: [
      {
        url: "/brand/og.png",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — India's First AI Footwear Platform`,
    description: SITE.description,
    images: ["/brand/og.png"]
  },
  icons: {
    icon: [{ url: "/brand/icon.png", sizes: "64x64", type: "image/png" }],
    shortcut: ["/brand/icon.png"],
    apple: [{ url: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" }]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  other: {
    // Helps answer engines attribute the brand and its promise consistently.
    "og:locale:alternate": "hi_IN"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <PageViewTracker />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
