import { LANDING_SERVICES } from "@/lib/landing-data";

/** Resolve mock landing id or UUID to Supabase service id */
export function resolvePreselectedServiceId(
  preselectedId: string | undefined,
  services: { id: string; name: string }[]
): string | null {
  if (!preselectedId) return null;

  const byUuid = services.find((s) => s.id === preselectedId);
  if (byUuid) return byUuid.id;

  const landing = LANDING_SERVICES.find((s) => s.mockId === preselectedId);
  if (!landing) return null;

  return services.find((s) => s.name === landing.seedName)?.id ?? null;
}
