import type { TranslationKey } from "@/lib/i18n/translations";
import { images } from "@/lib/images";

export type LandingService = {
  mockId: string;
  /** Matches `public.services.name` in Supabase seed */
  seedName: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  durationMinutes: number;
  priceDisplay: string;
};

export type LandingStaff = {
  id: string;
  seedName: string;
  nameKey: TranslationKey;
  titleKey: TranslationKey;
  bioKey: TranslationKey;
  /** Local path under /images/staff/ or fallback URL */
  avatarUrl: string;
};

export type LandingTestimonial = {
  id: string;
  quoteKey: TranslationKey;
  authorKey: TranslationKey;
  serviceKey: TranslationKey;
};

export const LANDING_SERVICES: LandingService[] = [
  {
    mockId: "mens-cut",
    seedName: "Men's Cut",
    nameKey: "services.mensCut.name",
    descriptionKey: "services.mensCut.description",
    durationMinutes: 30,
    priceDisplay: "$35+",
  },
  {
    mockId: "womens-cut",
    seedName: "Women's Cut",
    nameKey: "services.womensCut.name",
    descriptionKey: "services.womensCut.description",
    durationMinutes: 45,
    priceDisplay: "$55+",
  },
  {
    mockId: "blowout",
    seedName: "Blowout",
    nameKey: "services.blowout.name",
    descriptionKey: "services.blowout.description",
    durationMinutes: 45,
    priceDisplay: "$45+",
  },
  {
    mockId: "single-process",
    seedName: "Single Process Color",
    nameKey: "services.singleProcess.name",
    descriptionKey: "services.singleProcess.description",
    durationMinutes: 90,
    priceDisplay: "$95+",
  },
  {
    mockId: "partial-highlights",
    seedName: "Partial Highlights",
    nameKey: "services.partialHighlights.name",
    descriptionKey: "services.partialHighlights.description",
    durationMinutes: 120,
    priceDisplay: "$120+",
  },
  {
    mockId: "full-highlights",
    seedName: "Full Highlights",
    nameKey: "services.fullHighlights.name",
    descriptionKey: "services.fullHighlights.description",
    durationMinutes: 150,
    priceDisplay: "$165+",
  },
  {
    mockId: "balayage",
    seedName: "Balayage",
    nameKey: "services.balayage.name",
    descriptionKey: "services.balayage.description",
    durationMinutes: 180,
    priceDisplay: "$200+",
  },
  {
    mockId: "keratin",
    seedName: "Keratin Treatment",
    nameKey: "services.keratin.name",
    descriptionKey: "services.keratin.description",
    durationMinutes: 120,
    priceDisplay: "$250+",
  },
  {
    mockId: "perm",
    seedName: "Perm",
    nameKey: "services.perm.name",
    descriptionKey: "services.perm.description",
    durationMinutes: 150,
    priceDisplay: "$150+",
  },
];

export const LANDING_STAFF: LandingStaff[] = [
  {
    id: "alex-kim",
    seedName: "Alex Kim",
    nameKey: "staff.alexKim.name",
    titleKey: "staff.alexKim.title",
    bioKey: "staff.alexKim.bio",
    avatarUrl: images.staff.alexKim,
  },
  {
    id: "maria-santos",
    seedName: "Maria Santos",
    nameKey: "staff.mariaSantos.name",
    titleKey: "staff.mariaSantos.title",
    bioKey: "staff.mariaSantos.bio",
    avatarUrl: images.staff.mariaSantos,
  },
  {
    id: "jordan-lee",
    seedName: "Jordan Lee",
    nameKey: "staff.jordanLee.name",
    titleKey: "staff.jordanLee.title",
    bioKey: "staff.jordanLee.bio",
    avatarUrl: images.staff.jordanLee,
  },
  {
    id: "sofia-chen",
    seedName: "Sofia Chen",
    nameKey: "staff.sofiaChen.name",
    titleKey: "staff.sofiaChen.title",
    bioKey: "staff.sofiaChen.bio",
    avatarUrl: images.staff.sofiaChen,
  },
];

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    id: "1",
    quoteKey: "testimonials.1.quote",
    authorKey: "testimonials.1.author",
    serviceKey: "testimonials.1.service",
  },
  {
    id: "2",
    quoteKey: "testimonials.2.quote",
    authorKey: "testimonials.2.author",
    serviceKey: "testimonials.2.service",
  },
  {
    id: "3",
    quoteKey: "testimonials.3.quote",
    authorKey: "testimonials.3.author",
    serviceKey: "testimonials.3.service",
  },
];
