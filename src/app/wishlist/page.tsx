import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCard, DISPLAYABLE } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { Heart } from "lucide-react";

export const dynamic = "force-dynamic";

// Personal, logged-in content — keep it out of search indexes.
export const metadata: Metadata = {
  title: "My Wishlist",
  robots: { index: false, follow: false }
};

export default async function WishlistPage() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="container-app grid min-h-[50vh] place-items-center py-10 text-center">
        <div>
          <Heart className="mx-auto text-rose-400" size={40} />
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Your wishlist</h1>
          <p className="mt-1 text-slate-500">Login to save shoes and compare them later.</p>
          <Link href="/login?next=/wishlist" className="btn-primary mt-5">Login</Link>
        </div>
      </div>
    );
  }

  // A saved item whose image has since died is still hidden — the "no card
  // without an image" rule applies to personal lists too.
  const items = await prisma.wishlist.findMany({
    where: { userId: session.userId, product: DISPLAYABLE },
    include: { product: { include: { offers: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="container-app py-10">
      <h1 className="text-2xl font-extrabold text-slate-900">Your wishlist</h1>
      <p className="text-sm text-slate-500">{items.length} saved item(s)</p>

      {items.length === 0 ? (
        <div className="mt-16 text-center text-slate-500">
          <p>No saved shoes yet.</p>
          <Link href="/search" className="btn-primary mt-4">Discover footwear</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((i) => (
            <ProductCard key={i.id} p={toCard(i.product)} inWishlist />
          ))}
        </div>
      )}
    </div>
  );
}
