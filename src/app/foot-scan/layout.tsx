import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foot Fit Scan — Find Your Exact Shoe Size with Your Phone Camera",
  description:
    "Measure your foot at home in under a minute. Photograph your foot next to a bank card or A4 sheet and Upanah.AI returns your foot length, width and arch type, converted to the right UK, EU and US shoe size.",
  keywords: [
    "foot scan shoe size",
    "measure foot size at home",
    "shoe size calculator India",
    "UK EU US size conversion",
    "wide feet shoe size",
    "arch type test"
  ],
  alternates: { canonical: "/foot-scan" },
  openGraph: {
    title: "Foot Fit Scan — Your Exact Shoe Size from a Photo",
    description:
      "Foot length, width and arch type from a single phone photo, converted to your true UK, EU and US size.",
    url: "/foot-scan"
  }
};

export default function FootScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
