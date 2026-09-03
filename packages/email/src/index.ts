import { Resend } from "resend";
import { OrderConfirmation } from "./templates/OrderConfirmation";
import { ProjectStatusChanged } from "./templates/ProjectStatusChanged";
import { StaffInvite } from "./templates/StaffInvite";

// Built lazily, not at module load — Resend's constructor throws
// synchronously if no API key is available (env or arg), and this module is
// imported transitively by apps/web/app/api/inngest/route.ts, which Next.js
// imports during the build's "collect page data" step. Constructing eagerly
// meant any build without RESEND_API_KEY set would fail outright.
let resend: Resend | undefined;
function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}
const FROM = process.env.EMAIL_FROM ?? "Book Press <orders@example.com>";

export async function sendOrderConfirmation(params: {
  to: string;
  orderId: string;
  items: { title: string; quantity: number; priceCents: number }[];
  totalCents: number;
}) {
  return getResendClient().emails.send({
    from: FROM,
    to: params.to,
    subject: `Order confirmed — #${params.orderId}`,
    react: OrderConfirmation(params),
  });
}

export async function sendProjectStatusChanged(params: { to: string; bookTitle: string; status: string }) {
  return getResendClient().emails.send({
    from: FROM,
    to: params.to,
    subject: `Your project "${params.bookTitle}" is now ${params.status}`,
    react: ProjectStatusChanged(params),
  });
}

export async function sendStaffInvite(params: {
  to: string;
  name: string;
  inviteUrl: string;
  invitedByEmail: string;
  expiresInMinutes: number;
}) {
  return getResendClient().emails.send({
    from: FROM,
    to: params.to,
    subject: "Your invitation to the Book Press back office",
    react: StaffInvite(params),
  });
}

export { getResendClient };
