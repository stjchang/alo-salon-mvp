/** Public image paths under /public/images — add files to match these paths */

export const images = {
  hero: "/images/hero/hero.jpg",
  staff: {
    vicky: "/images/staff/vicky.jpg",
    mariaSantos: "/images/staff/maria-santos.jpg",
    jordanLee: "/images/staff/jordan-lee.jpg",
    sofiaChen: "/images/staff/sofia-chen.jpg",
  },
} as const;

/** Salon contact (footer, schema, etc.) */
export const salonContact = {
  addressLine1: "51 Berry Hill Rd",
  addressLine2: "Syosset, NY 11791",
  phone: "516-588-9280",
  phoneTel: "+15165889280",
  email: "info@alohairsyosset.com",
  mapsEmbedUrl:
    "https://maps.google.com/maps?q=Alo+Hair+Salon,+Syosset,+NY+11791&output=embed",
  instagramUrl: "https://www.instagram.com/alo_hair2020/",
} as const;
