import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Health-Aware Footwear Suggestions — Walk, Run & Pain Tracker",
  description:
    "Log your daily walks, runs and any foot, knee or back pain. Upanah.AI learns your routine and recommends footwear with the arch support, cushioning and grip your body is actually asking for — useful for seniors, diabetics and sportspersons.",
  keywords: [
    "shoes for foot pain India",
    "best shoes for knee pain",
    "diabetic footwear India",
    "shoes for plantar fasciitis",
    "footwear for seniors",
    "arch support shoes India"
  ],
  alternates: { canonical: "/health" },
  openGraph: {
    title: "Health-Aware Footwear Suggestions — Upanah.AI",
    description:
      "Recommendations that adapt to how much you walk and where it hurts.",
    url: "/health"
  }
};

export default function HealthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
