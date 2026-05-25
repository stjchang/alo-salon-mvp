import Link from "next/link";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function BookPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-semibold tracking-tight hover:underline">
            ALO Hair Salon
          </Link>
          <span className="text-sm text-muted-foreground">Book appointment</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Book your appointment
          </h1>
          <p className="mt-2 text-muted-foreground">
            No account needed — four quick steps.
          </p>
        </div>
        <BookingWizard />
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          Need to cancel? Use the link in your confirmation email.{" "}
          <Link href="/" className={cn(buttonVariants({ variant: "link" }), "inline h-auto p-0")}>
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
