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

export default function CancelNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Link not found</CardTitle>
          <CardDescription>
            This cancel link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className={cn(buttonVariants(), "w-full")}>
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
