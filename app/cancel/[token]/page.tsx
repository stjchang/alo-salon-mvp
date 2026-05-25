import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppointmentByCancelToken } from "@/lib/booking/get-appointment-by-token";
import { formatAppointmentDateTime } from "@/lib/booking/slots";
import { CancelAppointmentButton } from "@/components/booking/cancel-appointment-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CancelPage({ params }: PageProps) {
  const { token } = await params;
  const appointment = await getAppointmentByCancelToken(token);

  if (!appointment) {
    notFound();
  }

  const expired =
    appointment.status !== "confirmed" ||
    new Date() >= new Date(appointment.cancelTokenExpiresAt);

  const alreadyCancelled = appointment.status === "cancelled";

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-semibold tracking-tight hover:underline">
            ALO Hair Salon
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {alreadyCancelled
                ? "Already cancelled"
                : expired
                  ? "Cannot cancel"
                  : "Cancel appointment"}
            </CardTitle>
            <CardDescription>
              {alreadyCancelled
                ? "This appointment has already been cancelled."
                : expired
                  ? "This appointment can no longer be cancelled online."
                  : "Confirm you want to cancel your booking at ALO Hair Salon."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1 text-sm">
              <li>
                <strong>Service:</strong> {appointment.serviceName}
              </li>
              <li>
                <strong>Stylist:</strong> {appointment.staffName}
              </li>
              <li>
                <strong>When:</strong>{" "}
                {formatAppointmentDateTime(new Date(appointment.startsAt))}
              </li>
              <li>
                <strong>Guest:</strong> {appointment.customerName}
              </li>
            </ul>

            {!alreadyCancelled && !expired && (
              <CancelAppointmentButton token={token} />
            )}

            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Back to home
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
