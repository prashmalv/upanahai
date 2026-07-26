import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Virtual Shoe Try-On — See Shoes on You Before You Buy",
  description:
    "Upload your photo, pick a pair and an outfit context — casual, office, Indian ethnic or sportswear — and Upanah.AI previews how the footwear actually looks on you before you spend a rupee.",
  keywords: [
    "virtual shoe try on",
    "try shoes online",
    "AI try on footwear",
    "see shoes on my photo",
    "shoes with ethnic wear"
  ],
  alternates: { canonical: "/try-on" },
  openGraph: {
    title: "Virtual Shoe Try-On — Upanah.AI",
    description:
      "Preview any pair on your own photo across casual, office, ethnic and sportswear looks.",
    url: "/try-on"
  }
};

export default function TryOnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
