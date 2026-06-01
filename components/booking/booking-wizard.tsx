"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Users } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { formatSlotLabel } from "@/lib/booking/slots";
import { unwrapRelation } from "@/lib/supabase/relations";
import { useLanguage } from "@/components/providers/language-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { resolvePreselectedServiceId } from "@/lib/booking/resolve-service";
import {
  isTurnstileConfigured,
  TurnstileWidget,
} from "@/components/booking/turnstile-widget";
import { cn } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_display: string | null;
};

type StaffMember = {
  id: string;
  full_name: string;
  title: string | null;
};

type StaffRow = StaffMember & { is_active?: boolean; sort_order?: number };

type StaffSelection = string | "any";

const STEPS = ["Service", "Stylist", "Date & time", "Your details"] as const;

type BookingWizardProps = {
  initialServiceId?: string;
  onSuccess?: () => void;
};

export function BookingWizard({
  initialServiceId,
  onSuccess,
}: BookingWizardProps = {}) {
  const { t } = useLanguage();
  const [supabase, setSupabase] = useState<ReturnType<
    typeof createBrowserClient
  > | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSupabase(createBrowserClient());
      setConfigError(null);
    } catch (e) {
      setSupabase(null);
      setConfigError(
        e instanceof Error ? e.message : "Supabase configuration error"
      );
    } finally {
      setSupabaseReady(true);
    }
  }, []);

  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [initialApplied, setInitialApplied] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [slots, setSlots] = useState<string[]>([]);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<StaffSelection | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [confirmedStylistName, setConfirmedStylistName] = useState<
    string | null
  >(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const turnstileRequired = isTurnstileConfigured();

  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, description, duration_minutes, price_display")
        .eq("is_active", true)
        .order("sort_order");
      setServices(data ?? []);
    })().catch(console.error);
  }, [supabase]);

  useEffect(() => {
    if (!initialServiceId || initialApplied || services.length === 0) return;

    const resolved = resolvePreselectedServiceId(initialServiceId, services);
    if (resolved) {
      setServiceId(resolved);
      setStaffId(null);
      setStep(1);
    }
    setInitialApplied(true);
  }, [initialServiceId, initialApplied, services]);

  const loadStaffForService = useCallback(
    async (selectedServiceId: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("staff_services")
        .select("staff:staff_id ( id, full_name, title, is_active, sort_order )")
        .eq("service_id", selectedServiceId);

      const members: StaffMember[] =
        data
          ?.map((row) => unwrapRelation(row.staff) as StaffRow | null)
          .filter((s): s is StaffRow => Boolean(s && s.is_active !== false))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(({ id, full_name, title }) => ({ id, full_name, title })) ?? [];

      setStaff(members);
    },
    [supabase]
  );

  useEffect(() => {
    if (!serviceId || !supabase) return;
    loadStaffForService(serviceId).catch(console.error);
  }, [serviceId, supabase, loadStaffForService]);

  const dateString = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : null;

  useEffect(() => {
    if (!staffId || !serviceId || !dateString) {
      setSlots([]);
      return;
    }

    async function loadSlots() {
      setLoadingSlots(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          staffId: staffId!,
          serviceId: serviceId!,
          date: dateString!,
        });
        const res = await fetch(`/api/availability?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load times");
        setSlots(data.slots ?? []);
        setStartsAt(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load times");
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [staffId, serviceId, dateString]);

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedStaff = staff.find((s) => s.id === staffId);

  const stylistDisplayName =
    staffId === "any"
      ? t("booking.anyStylist.title")
      : (selectedStaff?.full_name ?? confirmedStylistName ?? "");

  async function handleSubmit() {
    if (!serviceId || !staffId || !startsAt) return;
    if (turnstileRequired && !turnstileToken) {
      setError("Please complete the security check before booking.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          staffId,
          startsAt,
          fullName,
          email,
          phone,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 || res.status === 429) {
          setTurnstileToken(null);
          setTurnstileResetKey((key) => key + 1);
        }
        throw new Error(data.error ?? "Booking failed");
      }
      if (typeof data.stylistName === "string") {
        setConfirmedStylistName(data.stylistName);
      }
      setSuccess(true);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseReady) {
    return (
      <p className="text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  if (!supabase) {
    return (
      <div className="space-y-2 text-center text-sm text-muted-foreground">
        <p>
          Configure Supabase in <code className="text-xs">.env.local</code> to
          enable booking.
        </p>
        {configError ? (
          <p className="text-xs text-destructive">{configError}</p>
        ) : null}
      </div>
    );
  }

  if (success) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>You&apos;re all set!</CardTitle>
          <CardDescription>
            A confirmation email has been sent to {email}. It includes a secure
            link to cancel — no account required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-1 text-sm">
            <li>
              <strong>Service:</strong> {selectedService?.name}
            </li>
            <li>
              <strong>Stylist:</strong>{" "}
              {confirmedStylistName ?? stylistDisplayName}
            </li>
            <li>
              <strong>Time:</strong>{" "}
              {startsAt && formatSlotLabel(new Date(startsAt))}
            </li>
          </ul>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to home
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex-1 rounded-full px-2 py-1 text-center text-xs font-medium",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted/50 text-muted-foreground"
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a service</CardTitle>
            <CardDescription>Select what you&apos;d like to book</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  setServiceId(service.id);
                  setStaffId(null);
                  setStep(1);
                }}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                  serviceId === service.id &&
                    "border-primary ring-2 ring-primary/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{service.name}</span>
                  {service.price_display && (
                    <span className="text-sm text-muted-foreground">
                      {service.price_display}
                    </span>
                  )}
                </div>
                {service.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {service.duration_minutes} min
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose your stylist</CardTitle>
            <CardDescription>
              Available for {selectedService?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stylists available for this service.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStaffId("any");
                    setStep(2);
                  }}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                    staffId === "any" &&
                      "border-primary ring-2 ring-primary/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium">
                        {t("booking.anyStylist.title")}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {t("booking.anyStylist.subtitle")}
                      </p>
                    </div>
                  </div>
                </button>
                {staff.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setStaffId(member.id);
                      setStep(2);
                    }}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                      staffId === member.id &&
                        "border-primary ring-2 ring-primary/20"
                    )}
                  >
                    <span className="font-medium">{member.full_name}</span>
                    {member.title && (
                      <p className="text-sm text-muted-foreground">
                        {member.title}
                      </p>
                    )}
                  </button>
                ))}
              </>
            )}
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Pick a date & time</CardTitle>
            <CardDescription>With {stylistDisplayName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
            />

            {selectedDate && (
              <div>
                <p className="mb-2 text-sm font-medium">Available times</p>
                {loadingSlots ? (
                  <p className="text-sm text-muted-foreground">
                    Loading times…
                  </p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available times on this day. Try another date.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={startsAt === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStartsAt(slot)}
                      >
                        {formatSlotLabel(new Date(slot))}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button disabled={!startsAt} onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              {selectedService?.name} with {stylistDisplayName} on{" "}
              {startsAt && formatSlotLabel(new Date(startsAt))}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(516) 555-0100"
                required
              />
            </div>

            {turnstileRequired && (
              <TurnstileWidget
                key={turnstileResetKey}
                onToken={setTurnstileToken}
              />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                disabled={
                  loading ||
                  !fullName.trim() ||
                  !email.trim() ||
                  !phone.trim() ||
                  (turnstileRequired && !turnstileToken)
                }
                onClick={handleSubmit}
              >
                {loading ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
