"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/landing/language-toggle";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  variant?: "landing" | "book";
};

export function SiteHeader({ variant = "landing" }: SiteHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-semibold tracking-tight hover:underline"
        >
          {t("brand.name")}
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {variant === "book" ? t("book.header.label") : t("brand.location")}
          </span>
          <LanguageToggle />
          {variant === "landing" && (
            <Link
              href="/book"
              className={cn(buttonVariants({ size: "sm" }), "min-h-9")}
            >
              {t("nav.book")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
