import { Resend } from "resend";
import { OrderConfirmation } from "./templates/OrderConfirmation";
import { ProjectStatusChanged } from "./templates/ProjectStatusChanged";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Book Press <orders@example.com>";

export async function sendOrderConfirmation(params: {
  to: string;
  orderId: string;
  items: { title: string; quantity: number; priceCents: number }[];
  totalCents: number;
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Order confirmed — #${params.orderId}`,
    react: OrderConfirmation(params),
  });
}

export async function sendProjectStatusChanged(params: { to: string; bookTitle: string; status: string }) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Your project "${params.bookTitle}" is now ${params.status}`,
    react: ProjectStatusChanged(params),
  });
}

export { resend };
