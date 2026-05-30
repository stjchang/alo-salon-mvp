"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className={cn("flex items-center gap-1 text-sm", className)}
      role="group"
      aria-label={t("lang.toggleAria")}
      suppressHydrationWarning
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "min-h-9 min-w-9 rounded-md px-2 font-medium transition-colors",
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
        aria-pressed={locale === "en"}
        aria-label="English"
      >
        {t("lang.en")}
      </button>
      <span className="text-muted-foreground" aria-hidden>
        |
      </span>
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={cn(
          "min-h-9 min-w-9 rounded-md px-2 font-medium transition-colors",
          locale === "ko"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
        aria-pressed={locale === "ko"}
        aria-label="Korean"
      >
        {t("lang.ko")}
      </button>
    </div>
  );
}
