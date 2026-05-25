import { NextResponse } from "next/server";
import { availabilityQuerySchema } from "@/lib/validators/booking";
import { getAvailableSlots } from "@/lib/booking/availability";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = availabilityQuerySchema.parse({
      staffId: searchParams.get("staffId"),
      serviceId: searchParams.get("serviceId"),
      date: searchParams.get("date"),
    });

    const slots = await getAvailableSlots(parsed);
    return NextResponse.json({ slots });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
