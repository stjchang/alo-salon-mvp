import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="font-semibold tracking-tight">ALO Hair Salon</span>
          <span className="text-sm text-muted-foreground">Syosset, NY</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Book online in under a minute
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Your next visit starts here
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose a service, pick your stylist, and confirm — no account
            required. We&apos;ll email you a secure link to cancel if plans
            change.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/book" className={cn(buttonVariants({ size: "lg" }), "min-w-[200px]")}>
              Book an appointment
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-16 grid w-full max-w-3xl gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Book</CardTitle>
              <CardDescription>Frictionless scheduling</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ol className="list-inside list-decimal space-y-2">
                <li>Select your service</li>
                <li>Choose a stylist</li>
                <li>Pick date & time</li>
                <li>Enter name, email & phone</li>
              </ol>
              <Link
                href="/book"
                className={cn(buttonVariants(), "mt-4 w-full")}
              >
                Start booking
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cancel</CardTitle>
              <CardDescription>No login needed</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                After you book, your confirmation email includes a private
                cancel link. Open it anytime before your appointment to cancel
                instantly.
              </p>
              <p className="mt-3 text-xs">
                Don&apos;t have the link? Check your inbox for an email from
                ALO Hair Salon.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        ALO Hair Salon · Syosset, NY
      </footer>
    </div>
  );
}
