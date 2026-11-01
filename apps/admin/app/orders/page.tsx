import { redirect } from "next/navigation";

// FR-11.2's order dashboard is now Sales Orders, under "Supply and Sales" in
// the sidebar; this keeps old links and bookmarks working.
export default function OrdersPage() {
  redirect("/supply/sales-orders");
}
