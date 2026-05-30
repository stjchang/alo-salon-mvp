"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { SiteHeader } from "@/components/landing/site-header";
import { useLanguage } from "@/components/providers/language-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import {
  LANDING_SERVICES,
  LANDING_STAFF,
  LANDING_TESTIMONIALS,
} from "@/lib/landing-data";
import { FOOTER_HOURS_KEYS } from "@/lib/i18n/translations";
import { images, salonContact } from "@/lib/images";
import { cn } from "@/lib/utils";

const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80&auto=format&fit=crop";

function heroBackgroundStyle(): CSSProperties {
  return {
    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.72)), url(${images.hero}), url(${HERO_FALLBACK})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader variant="landing" />

      <main>
        {/* Hero */}
        <section
          className="relative flex min-h-[80vh] flex-col items-center justify-center px-4 py-20 text-center text-white"
          style={heroBackgroundStyle()}
          aria-labelledby="hero-heading"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-white/80">
            {t("hero.eyebrow")}
          </p>
          <h1
            id="hero-heading"
            className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            {t("hero.title")}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90 sm:text-xl">
            {t("hero.subtitle")}
          </p>
          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-8 min-h-12 min-w-[220px] text-base"
            )}
          >
            {t("hero.cta")}
          </Link>
        </section>

        {/* Services */}
        <section
          id="services"
          className="mx-auto max-w-6xl px-4 py-16 md:py-20"
          aria-labelledby="services-heading"
        >
          <div className="mb-10 text-center">
            <h2
              id="services-heading"
              className="text-3xl font-semibold tracking-tight"
            >
              {t("services.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("services.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {LANDING_SERVICES.map((service) => (
              <Card key={service.mockId} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {t(service.nameKey)}
                  </CardTitle>
                  <CardDescription>{t(service.descriptionKey)}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-3 pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {t("services.duration", {
                        minutes: service.durationMinutes,
                      })}
                    </span>
                    <span className="font-medium text-foreground">
                      {service.priceDisplay}
                    </span>
                  </div>
                  <Link
                    href={`/book?service=${service.mockId}`}
                    className={cn(
                      buttonVariants(),
                      "min-h-11 w-full"
                    )}
                  >
                    {t("services.select")}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Stylists */}
        <section
          id="stylists"
          className="bg-muted/40 px-4 py-16 md:py-20"
          aria-labelledby="stylists-heading"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2
                id="stylists-heading"
                className="text-3xl font-semibold tracking-tight"
              >
                {t("stylists.title")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("stylists.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {LANDING_STAFF.map((member) => (
                <article
                  key={member.id}
                  className="flex flex-col items-center text-center"
                >
                  <Avatar className="size-24 border-2 border-background shadow-md">
                    <AvatarImage
                      src={member.avatarUrl}
                      alt={t(member.nameKey)}
                    />
                    <AvatarFallback>
                      {t(member.nameKey)
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mt-4 text-lg font-semibold">
                    {t(member.nameKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(member.titleKey)}
                  </p>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    {t(member.bioKey)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section
          id="testimonials"
          className="mx-auto max-w-6xl px-4 py-16 md:py-20"
          aria-labelledby="testimonials-heading"
        >
          <div className="mb-10 text-center">
            <h2
              id="testimonials-heading"
              className="text-3xl font-semibold tracking-tight"
            >
              {t("testimonials.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("testimonials.subtitle")}
            </p>
          </div>

          <Carousel
            className="relative mx-auto w-full max-w-xl px-10 sm:px-12"
            opts={{ align: "start", loop: true }}
          >
            <CarouselContent>
              {LANDING_TESTIMONIALS.map((item) => (
                <CarouselItem key={item.id}>
                  <Card className="border-none shadow-md">
                    <CardContent className="flex flex-col gap-4 p-8 pt-8">
                      <p
                        className="text-sm text-amber-600 dark:text-amber-400"
                        aria-label={t("testimonials.stars")}
                      >
                        {t("testimonials.stars")}
                      </p>
                      <p className="text-lg leading-relaxed">
                        &ldquo;{t(item.quoteKey)}&rdquo;
                      </p>
                      <div>
                        <p className="font-medium">{t(item.authorKey)}</p>
                        <p className="text-sm text-muted-foreground">
                          {t(item.serviceKey)} · {t("testimonials.source")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              className="static mt-4 translate-y-0 sm:absolute sm:-left-12 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2"
              aria-label={t("testimonials.prev")}
            />
            <CarouselNext
              className="static mt-2 translate-y-0 sm:absolute sm:-right-12 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2"
              aria-label={t("testimonials.next")}
            />
          </Carousel>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-100">
        <Separator className="bg-slate-700" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
              {t("footer.location")}
            </h3>
            <p className="text-sm leading-relaxed">
              {salonContact.addressLine1}
              <br />
              {salonContact.addressLine2}
            </p>
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-md bg-slate-800">
              <iframe
                title={t("footer.mapsAria")}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={salonContact.mapsEmbedUrl}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
              {t("footer.hours")}
            </h3>
            <ul className="space-y-1 text-sm">
              {FOOTER_HOURS_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
              {t("footer.contact")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={`tel:${salonContact.phoneTel}`}
                  className="underline-offset-4 hover:underline"
                >
                  {salonContact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${salonContact.email}`}
                  className="underline-offset-4 hover:underline"
                >
                  {salonContact.email}
                </a>
              </li>
              <li>
                <a
                  href={salonContact.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("footer.instagramAria")}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-100 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-6"
                    aria-hidden
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="bg-slate-700" />
        <p
          className="px-4 py-6 text-center text-xs text-slate-400"
          suppressHydrationWarning
        >
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}
