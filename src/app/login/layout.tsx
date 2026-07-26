import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in to Upanah.AI",
  description:
    "Sign in to save your foot measurements, wishlist and health log so Upanah.AI can personalise every footwear recommendation.",
  robots: { index: false, follow: true }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
