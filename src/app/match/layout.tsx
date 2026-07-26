import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Shoes from a Photo — AI Shoe Identifier for India",
  description:
    "Saw a pair you liked? Upload or snap a photo and Upanah.AI identifies the shoe, then shows visually similar branded footwear actually available in India — with prices compared across retailers.",
  keywords: [
    "find shoes from photo",
    "identify shoe from image",
    "shoe image search India",
    "similar shoes finder",
    "reverse image search shoes"
  ],
  alternates: { canonical: "/match" },
  openGraph: {
    title: "Find Shoes from a Photo — AI Shoe Identifier",
    description:
      "Snap any shoe. Get the identification plus similar branded pairs available in India.",
    url: "/match"
  }
};

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
