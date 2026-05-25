"use client";

import Link from "next/link";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { SiteHeader } from "@/components/landing/site-header";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BookPageContent() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader variant="book" />

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("book.page.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("book.page.subtitle")}</p>
        </div>
        <BookingWizard />
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          {t("book.page.cancelHint")}{" "}
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "link" }), "inline h-auto min-h-9 p-0")}
          >
            {t("book.page.backHome")}
          </Link>
        </p>
      </main>
    </div>
  );
}
