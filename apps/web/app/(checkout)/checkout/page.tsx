"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Separator } from "@repo/ui/separator";

// FR-3.2–3.5: address, tax/shipping calc, guest/account checkout, order confirmation.
// Real implementation: a Server Action creates the Order + Razorpay order
// (Section 3.6), then opens Razorpay's hosted Checkout client-side. The form
// below is the visual shell that Server Action will submit to.
export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const subtotal = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="font-serif text-3xl font-medium text-brand-navy">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="font-serif text-lg font-medium text-brand-navy">Contact</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="font-serif text-lg font-medium text-brand-navy">Shipping address</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="line1">Address line 1</Label>
                  <Input id="line1" placeholder="123 MG Road" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Bengaluru" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="Karnataka" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postal">Postal code</Label>
                  <Input id="postal" placeholder="560001" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="+91 98765 43210" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Payment is handled by Razorpay&apos;s secure checkout — you&apos;ll be redirected after reviewing your order.
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="p-6">
            <p className="font-serif text-lg font-medium text-brand-navy">Order summary</p>
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li key={item.productId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.title} × {item.quantity}</span>
                  <span className="text-foreground">₹{((item.priceCents * item.quantity) / 100).toFixed(2)}</span>
                </li>
              ))}
              {items.length === 0 && <li className="text-sm text-muted-foreground">Your cart is empty.</li>}
            </ul>
            <Separator className="my-4" />
            <div className="flex justify-between text-base font-semibold text-foreground">
              <span>Total</span>
              <span>₹{(subtotal / 100).toFixed(2)}</span>
            </div>
            <Button size="lg" className="mt-6 w-full" disabled={items.length === 0}>
              Continue to payment
            </Button>
            <Link href="/cart" className="mt-3 block text-center text-sm text-muted-foreground hover:text-brand-navy">
              Back to cart
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
