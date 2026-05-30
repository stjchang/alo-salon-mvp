import { Resend } from "resend";
import { formatAppointmentDateTime } from "@/lib/booking/slots";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromEmail() {
  return (
    process.env.RESEND_FROM_EMAIL ??
    "ALO Hair Salon <bookings@resend.dev>"
  );
}

type ConfirmationEmailInput = {
  to: string;
  customerName: string;
  serviceName: string;
  stylistName: string;
  startsAt: Date;
  cancelUrl: string;
};

export async function sendBookingConfirmation(
  input: ConfirmationEmailInput
): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("Resend not configured; skipping confirmation email");
    return;
  }

  const when = formatAppointmentDateTime(input.startsAt);

  await resend.emails.send({
    from: getFromEmail(),
    to: input.to,
    subject: "Your ALO Hair Salon appointment is confirmed",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="font-size: 24px;">You're booked!</h1>
        <p>Hi ${input.customerName},</p>
        <p>Your appointment with <strong>${input.stylistName}</strong> is confirmed at <strong>ALO Hair Salon</strong> in Syosset.</p>
        <ul>
          <li><strong>Service:</strong> ${input.serviceName}</li>
          <li><strong>Stylist:</strong> ${input.stylistName}</li>
          <li><strong>When:</strong> ${when}</li>
        </ul>
        <p>Need to cancel? Use the secure link below — no account required.</p>
        <p>
          <a href="${input.cancelUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            Cancel appointment
          </a>
        </p>
        <p style="color:#666;font-size:14px;">ALO Hair Salon · Syosset, NY</p>
      </div>
    `,
  });
}

type CancellationEmailInput = {
  to: string;
  customerName: string;
  serviceName: string;
  stylistName: string;
  startsAt: Date;
};

export async function sendCancellationConfirmation(
  input: CancellationEmailInput
): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("Resend not configured; skipping cancellation email");
    return;
  }

  const when = formatAppointmentDateTime(input.startsAt);

  await resend.emails.send({
    from: getFromEmail(),
    to: input.to,
    subject: "Your ALO Hair Salon appointment has been cancelled",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="font-size: 24px;">Appointment cancelled</h1>
        <p>Hi ${input.customerName},</p>
        <p>Your appointment has been cancelled:</p>
        <ul>
          <li><strong>Service:</strong> ${input.serviceName}</li>
          <li><strong>Stylist:</strong> ${input.stylistName}</li>
          <li><strong>Was scheduled for:</strong> ${when}</li>
        </ul>
        <p>We hope to see you again soon at ALO Hair Salon.</p>
      </div>
    `,
  });
}
