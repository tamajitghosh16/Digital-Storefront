import { permanentRedirect } from "next/navigation";

// The approved design puts delivery details and payment on the cart
// screen rather than behind a second step, so this route only exists to
// keep existing links and bookmarks working.
export default function CheckoutPage(): never {
  permanentRedirect("/cart");
}
