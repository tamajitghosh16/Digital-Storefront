import "server-only";
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

/**
 * Subject lines interpolate data (a book title an author typed, an order
 * id). Strip CR/LF and other control characters so nothing can smuggle a
 * header or a misleading second line into a mail client, and cap the length.
 */
function subjectPart(value: string, max = 120): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

export async function sendOrderConfirmation(params: {
  to: string;
  orderId: string;
  items: { title: string; quantity: number; priceCents: number }[];
  totalCents: number;
}) {
  return getResendClient().emails.send({
    from: FROM,
    to: params.to,
    subject: `Order confirmed — #${subjectPart(params.orderId, 40)}`,
    react: OrderConfirmation(params),
  });
}

export async function sendProjectStatusChanged(params: { to: string; bookTitle: string; status: string }) {
  return getResendClient().emails.send({
    from: FROM,
    to: params.to,
    subject: `Your project "${subjectPart(params.bookTitle)}" is now ${subjectPart(params.status, 40)}`,
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
