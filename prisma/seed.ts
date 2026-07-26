import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Seed = {
  brand: string;
  name: string;
  gender: string;
  category: string;
  description: string;
  imageUrl: string;
  colorway: string;
  basePrice: number;
  rating: number;
  reviewCount: number;
  tags: string;
  archSupport: number;
  cushioning: number;
  grip: number;
  breathability: number;
  suitsPersonas: string;
  offers: { retailer: string; price: number; url: string; deliveryDays: number; retailerRating: number }[];
};

const img = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=800&q=70`;

/**
 * Verified Wikimedia Commons image. Used where a stock photo was wrong or dead
 * and a correctly-categorised, freely-licensed replacement was confirmed by the
 * vision audit (prisma/audit-images.ts). Attribution note kept alongside.
 */
const commons = (file: string, _credit: string) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${file}`;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const products: Seed[] = [
  {
    brand: "Nike",
    name: "Revolution 7 Running Shoes",
    gender: "men",
    category: "running",
    description:
      "Lightweight everyday running shoe with soft foam cushioning and breathable mesh — great for beginners and daily joggers.",
    imageUrl: img("photo-1542291026-7eec264c27ff"),
    colorway: "Black / White",
    basePrice: 3995,
    rating: 4.4,
    reviewCount: 1820,
    tags: "running,daily,cushioned,lightweight,jogging,road",
    archSupport: 3, cushioning: 4, grip: 4, breathability: 5,
    suitsPersonas: "general,sports",
    offers: [
      { retailer: "Nike.com", price: 3995, url: "https://www.nike.com/in/", deliveryDays: 4, retailerRating: 4.6 },
      { retailer: "Myntra", price: 3596, url: "https://www.myntra.com/", deliveryDays: 3, retailerRating: 4.3 },
      { retailer: "Amazon.in", price: 3499, url: "https://www.amazon.in/", deliveryDays: 2, retailerRating: 4.4 }
    ]
  },
  {
    brand: "Adidas",
    name: "Galaxy 6 Running Shoes",
    gender: "women",
    category: "running",
    description:
      "Cushioned running shoe with Cloudfoam midsole for comfortable long-distance runs and gym cardio.",
    imageUrl: img("photo-1595950653106-6c9ebd614d3a"),
    colorway: "Pink / Grey",
    basePrice: 4299,
    rating: 4.3,
    reviewCount: 940,
    tags: "running,cushioned,gym,cardio,women,cloudfoam",
    archSupport: 3, cushioning: 5, grip: 4, breathability: 4,
    suitsPersonas: "general,sports",
    offers: [
      { retailer: "Adidas.co.in", price: 4299, url: "https://www.adidas.co.in/", deliveryDays: 4, retailerRating: 4.5 },
      { retailer: "Flipkart", price: 3869, url: "https://www.flipkart.com/", deliveryDays: 3, retailerRating: 4.1 },
      { retailer: "Ajio", price: 3999, url: "https://www.ajio.com/", deliveryDays: 5, retailerRating: 4.0 }
    ]
  },
  {
    brand: "Asics",
    name: "Gel-Contend 8",
    gender: "men",
    category: "running",
    description:
      "Stability-oriented running shoe with rearfoot GEL cushioning — ideal for runners who need extra shock absorption and support.",
    imageUrl: img("photo-1600185365483-26d7a4cc7519"),
    colorway: "Blue / Black",
    basePrice: 5499,
    rating: 4.6,
    reviewCount: 610,
    tags: "running,stability,support,shock-absorption,gel,long-distance",
    archSupport: 5, cushioning: 5, grip: 4, breathability: 4,
    suitsPersonas: "general,sports,senior",
    offers: [
      { retailer: "Asics.com", price: 5499, url: "https://www.asics.com/in/en-in/", deliveryDays: 5, retailerRating: 4.6 },
      { retailer: "Amazon.in", price: 4949, url: "https://www.amazon.in/", deliveryDays: 2, retailerRating: 4.4 }
    ]
  },
  {
    brand: "Puma",
    name: "Softride Enzo Sneakers",
    gender: "men",
    category: "casual",
    description:
      "All-day comfort sneaker with SoftFoam+ insole. Sporty casual look that pairs with jeans and chinos.",
    imageUrl: img("photo-1608231387042-66d1773070a5"),
    colorway: "Grey / Orange",
    basePrice: 3499,
    rating: 4.2,
    reviewCount: 1230,
    tags: "casual,sneaker,comfort,everyday,softfoam,office-casual",
    archSupport: 3, cushioning: 4, grip: 3, breathability: 4,
    suitsPersonas: "general",
    offers: [
      { retailer: "Puma.com", price: 3499, url: "https://in.puma.com/", deliveryDays: 4, retailerRating: 4.4 },
      { retailer: "Myntra", price: 2799, url: "https://www.myntra.com/", deliveryDays: 3, retailerRating: 4.3 }
    ]
  },
  {
    brand: "Skechers",
    name: "Go Walk 6 Slip-on",
    gender: "women",
    category: "walking",
    description:
      "Ultra-light slip-on walking shoe with Air-Cooled Goga Mat insole and Comfort Pillar cushioning — a favourite for seniors and long walks.",
    imageUrl: img("photo-1618354691373-d851c5c3a990"),
    colorway: "Navy",
    basePrice: 5999,
    rating: 4.7,
    reviewCount: 2100,
    tags: "walking,slip-on,lightweight,comfort,senior,easy-wear,arch-support",
    archSupport: 4, cushioning: 5, grip: 4, breathability: 4,
    suitsPersonas: "general,senior",
    offers: [
      { retailer: "Skechers.in", price: 5999, url: "https://www.skechers.in/", deliveryDays: 4, retailerRating: 4.5 },
      { retailer: "Amazon.in", price: 5399, url: "https://www.amazon.in/", deliveryDays: 2, retailerRating: 4.5 },
      { retailer: "Flipkart", price: 5499, url: "https://www.flipkart.com/", deliveryDays: 3, retailerRating: 4.2 }
    ]
  },
  {
    brand: "Bata",
    name: "Comfit Cushion Walk",
    gender: "men",
    category: "walking",
    description:
      "Value-for-money cushioned walking shoe with soft footbed and shock-absorbing sole. Wide-fit friendly.",
    imageUrl: img("photo-1449505278894-297fdb3edbc1"),
    colorway: "Brown",
    basePrice: 2299,
    rating: 4.1,
    reviewCount: 540,
    tags: "walking,comfort,wide-fit,affordable,cushioned,senior,daily",
    archSupport: 4, cushioning: 4, grip: 4, breathability: 3,
    suitsPersonas: "general,senior",
    offers: [
      { retailer: "Bata.in", price: 2299, url: "https://www.bata.in/", deliveryDays: 4, retailerRating: 4.1 },
      { retailer: "Amazon.in", price: 1999, url: "https://www.amazon.in/", deliveryDays: 3, retailerRating: 4.0 }
    ]
  },
  {
    brand: "Dr. Scholl's",
    name: "Ortho+ Arch Support Shoe",
    gender: "unisex",
    category: "orthopedic",
    description:
      "Orthopedic-grade footwear with contoured arch support and memory-foam heel cup. Recommended for plantar fasciitis and flat feet.",
    imageUrl: img("photo-1465479423260-c4afc24172c6"),
    colorway: "Black",
    basePrice: 4599,
    rating: 4.5,
    reviewCount: 320,
    tags: "orthopedic,arch-support,plantar-fasciitis,flat-feet,heel-pain,senior,medical",
    archSupport: 5, cushioning: 5, grip: 4, breathability: 3,
    suitsPersonas: "senior,general",
    offers: [
      { retailer: "Amazon.in", price: 4599, url: "https://www.amazon.in/", deliveryDays: 3, retailerRating: 4.3 },
      { retailer: "1mg", price: 4799, url: "https://www.1mg.com/", deliveryDays: 4, retailerRating: 4.2 }
    ]
  },
  {
    brand: "Nike",
    name: "Mercurial Vapor Turf Boots",
    gender: "men",
    category: "sports",
    description:
      "Football turf boots with responsive plate and grippy studs for quick acceleration on artificial ground.",
    imageUrl: img("photo-1511886929837-354d827aae26"),
    colorway: "Volt / Black",
    basePrice: 8995,
    rating: 4.5,
    reviewCount: 410,
    tags: "sports,football,turf,studs,grip,performance,athlete",
    archSupport: 3, cushioning: 3, grip: 5, breathability: 4,
    suitsPersonas: "sports",
    offers: [
      { retailer: "Nike.com", price: 8995, url: "https://www.nike.com/in/", deliveryDays: 5, retailerRating: 4.6 },
      { retailer: "Decathlon", price: 8495, url: "https://www.decathlon.in/", deliveryDays: 3, retailerRating: 4.4 }
    ]
  },
  {
    brand: "Adidas",
    name: "Adizero Cricket Spikes",
    gender: "men",
    category: "sports",
    description:
      "Lightweight cricket shoe with full spike layout for bowlers seeking maximum traction and stability at the crease.",
    imageUrl: img("photo-1580867532206-7c78b0aa9e64"),
    colorway: "White / Blue",
    basePrice: 7999,
    rating: 4.4,
    reviewCount: 180,
    tags: "sports,cricket,spikes,traction,bowler,athlete,performance",
    archSupport: 4, cushioning: 3, grip: 5, breathability: 4,
    suitsPersonas: "sports",
    offers: [
      { retailer: "Adidas.co.in", price: 7999, url: "https://www.adidas.co.in/", deliveryDays: 5, retailerRating: 4.5 },
      { retailer: "Amazon.in", price: 7299, url: "https://www.amazon.in/", deliveryDays: 3, retailerRating: 4.2 }
    ]
  },
  {
    brand: "Crocs",
    name: "Classic Clog Kids",
    gender: "kids",
    category: "casual",
    description:
      "Lightweight waterproof clog with ventilation ports and secure heel strap. Easy for little ones to wear themselves.",
    imageUrl: img("photo-1603487742131-4160ec999306"),
    colorway: "Blue",
    basePrice: 2495,
    rating: 4.6,
    reviewCount: 1500,
    tags: "kids,casual,waterproof,easy-wear,lightweight,school,play",
    archSupport: 2, cushioning: 3, grip: 3, breathability: 5,
    suitsPersonas: "kids",
    offers: [
      { retailer: "Crocs.in", price: 2495, url: "https://www.crocs.in/", deliveryDays: 4, retailerRating: 4.5 },
      { retailer: "Myntra", price: 2121, url: "https://www.myntra.com/", deliveryDays: 3, retailerRating: 4.4 }
    ]
  },
  {
    brand: "Campus",
    name: "Kids Velcro Sports Shoe",
    gender: "kids",
    category: "sports",
    description:
      "Durable school & play sports shoe with easy velcro straps, cushioned sole and non-marking grip.",
    imageUrl: img("photo-1514989940723-e8e51635b782"),
    colorway: "Red / Grey",
    basePrice: 1299,
    rating: 4.2,
    reviewCount: 890,
    tags: "kids,sports,velcro,school,play,affordable,grip,easy-wear",
    archSupport: 3, cushioning: 3, grip: 4, breathability: 4,
    suitsPersonas: "kids",
    offers: [
      { retailer: "Amazon.in", price: 1299, url: "https://www.amazon.in/", deliveryDays: 2, retailerRating: 4.1 },
      { retailer: "Flipkart", price: 1149, url: "https://www.flipkart.com/", deliveryDays: 3, retailerRating: 4.0 }
    ]
  },
  {
    brand: "Clarks",
    name: "Whiddon Formal Derby",
    gender: "men",
    category: "formal",
    description:
      "Genuine leather formal derby with cushioned Ortholite footbed. Office-ready and comfortable for all-day wear.",
    imageUrl: img("photo-1533867617858-e7b97e060509"),
    colorway: "Tan Leather",
    basePrice: 6999,
    rating: 4.4,
    reviewCount: 260,
    tags: "formal,office,leather,derby,indian-western,cushioned,professional",
    archSupport: 3, cushioning: 4, grip: 3, breathability: 3,
    suitsPersonas: "general",
    offers: [
      { retailer: "Clarks.in", price: 6999, url: "https://www.clarks.in/", deliveryDays: 5, retailerRating: 4.4 },
      { retailer: "Myntra", price: 5599, url: "https://www.myntra.com/", deliveryDays: 3, retailerRating: 4.3 }
    ]
  },
  {
    brand: "Metro",
    name: "Ethnic Mojari Juti",
    gender: "men",
    category: "formal",
    description:
      "Handcrafted ethnic mojari perfect for weddings and festive Indian wear. Soft cushioned insole for lasting comfort.",
    imageUrl: commons(
      "5/57/Indian_mojari%2C_19th_century%2C_red_velvet_with_gold_embroidery_and_sequins_-_Bata_Shoe_Museum_-_DSC00132.JPG/960px-Indian_mojari%2C_19th_century%2C_red_velvet_with_gold_embroidery_and_sequins_-_Bata_Shoe_Museum_-_DSC00132.JPG",
      "Wikimedia Commons, CC0"
    ),
    colorway: "Maroon",
    basePrice: 2199,
    rating: 4.1,
    reviewCount: 310,
    tags: "ethnic,indian-wear,festive,wedding,mojari,juti,traditional",
    archSupport: 2, cushioning: 3, grip: 2, breathability: 3,
    suitsPersonas: "general",
    offers: [
      { retailer: "Metroshoes.com", price: 2199, url: "https://www.metroshoes.com/", deliveryDays: 4, retailerRating: 4.2 },
      { retailer: "Ajio", price: 1979, url: "https://www.ajio.com/", deliveryDays: 5, retailerRating: 4.0 }
    ]
  },
  {
    brand: "Woodland",
    name: "Leather Trekking Boots",
    gender: "men",
    category: "casual",
    description:
      "Rugged nubuck leather outdoor boot with high-traction sole. Built for trekking, travel and rough terrain.",
    imageUrl: img("photo-1520639888713-7851133b1c17"),
    colorway: "Khaki",
    basePrice: 4995,
    rating: 4.3,
    reviewCount: 720,
    tags: "outdoor,trekking,boots,leather,grip,rugged,travel,adventure",
    archSupport: 4, cushioning: 3, grip: 5, breathability: 3,
    suitsPersonas: "general,sports",
    offers: [
      { retailer: "Woodlandworldwide.com", price: 4995, url: "https://www.woodlandworldwide.com/", deliveryDays: 4, retailerRating: 4.3 },
      { retailer: "Amazon.in", price: 4495, url: "https://www.amazon.in/", deliveryDays: 2, retailerRating: 4.2 }
    ]
  },
  {
    brand: "Birkenstock",
    name: "Arizona Cork Sandals",
    gender: "unisex",
    category: "sandals",
    description:
      "Iconic contoured cork footbed sandal offering excellent arch support. Great for all-day casual comfort.",
    imageUrl: img("photo-1603487742131-4160ec999306"),
    colorway: "Brown",
    basePrice: 7500,
    rating: 4.6,
    reviewCount: 430,
    tags: "sandals,arch-support,cork,casual,comfort,summer,footbed",
    archSupport: 5, cushioning: 4, grip: 3, breathability: 5,
    suitsPersonas: "general,senior",
    offers: [
      { retailer: "Birkenstock.in", price: 7500, url: "https://www.birkenstock.in/", deliveryDays: 5, retailerRating: 4.5 },
      { retailer: "Myntra", price: 6750, url: "https://www.myntra.com/", deliveryDays: 3, retailerRating: 4.4 }
    ]
  },
  {
    brand: "New Balance",
    name: "Fresh Foam 1080 v13",
    gender: "women",
    category: "running",
    description:
      "Premium max-cushion running shoe with plush Fresh Foam X midsole. Smooth ride for marathon training and recovery runs.",
    imageUrl: img("photo-1539185441755-769473a23570"),
    colorway: "Lavender",
    basePrice: 14999,
    rating: 4.7,
    reviewCount: 210,
    tags: "running,max-cushion,marathon,premium,recovery,long-distance,athlete",
    archSupport: 4, cushioning: 5, grip: 4, breathability: 4,
    suitsPersonas: "sports,general",
    offers: [
      { retailer: "NewBalance.in", price: 14999, url: "https://www.newbalance.in/", deliveryDays: 5, retailerRating: 4.6 },
      { retailer: "Tata CLiQ", price: 13499, url: "https://www.tatacliq.com/", deliveryDays: 4, retailerRating: 4.3 }
    ]
  }
];

async function main() {
  console.log("Seeding Upanah.AI database...");

  await prisma.feedback.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.product.deleteMany();

  for (const p of products) {
    const created = await prisma.product.create({
      data: {
        brand: p.brand,
        name: p.name,
        slug: slugify(`${p.brand}-${p.name}`),
        gender: p.gender,
        category: p.category,
        description: p.description,
        imageUrl: p.imageUrl,
        colorway: p.colorway,
        basePrice: p.basePrice,
        rating: p.rating,
        reviewCount: p.reviewCount,
        tags: p.tags,
        archSupport: p.archSupport,
        cushioning: p.cushioning,
        grip: p.grip,
        breathability: p.breathability,
        suitsPersonas: p.suitsPersonas,
        offers: { create: p.offers }
      }
    });

    // a couple of sample feedbacks
    await prisma.feedback.createMany({
      data: [
        {
          productId: created.id,
          authorName: "Verified Buyer",
          rating: Math.round(p.rating),
          fitFeedback: "true-to-size",
          comment: "Comfortable and good quality. Fits as expected."
        },
        {
          productId: created.id,
          authorName: "Ankit S.",
          rating: Math.max(3, Math.round(p.rating) - 1),
          fitFeedback: p.category === "formal" ? "small" : "true-to-size",
          comment:
            p.category === "formal"
              ? "Runs slightly small, consider half size up."
              : "Great value for the price. Would recommend."
        }
      ]
    });
  }

  // No demo account is seeded: a publicly documented password on a live site is
  // an open door. The admin account is provisioned separately and idempotently
  // by prisma/ensure-admin.ts, which runs on every boot.

  const count = await prisma.product.count();
  console.log(`Seed complete: ${count} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
