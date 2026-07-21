"use client";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, BookOpen, Tablet, Sparkles } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { Separator } from "@repo/ui/separator";
import { Badge } from "@repo/ui/badge";

const fulfillmentLabel = { SHIP: "Physical", DIGITAL: "E-book", SERVICE: "Service" } as const;
const fulfillmentIcon = { SHIP: BookOpen, DIGITAL: Tablet, SERVICE: Sparkles } as const;

// FR-3.1: single cart containing mixed items (physical books, e-books, services).
export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const subtotal = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center sm:px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy-50">
          <ShoppingBag className="h-6 w-6 text-brand-navy" strokeWidth={1.5} />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-medium text-brand-navy">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Browse the catalogue to find your next read.</p>
        <Button asChild className="mt-6">
          <Link href="/">Continue browsing</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="font-serif text-3xl font-medium text-brand-navy">Your Cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.productId}>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-navy-50 to-brand-cream">
                    {(() => {
                      const Icon = fulfillmentIcon[item.fulfillmentType];
                      return <Icon className="h-5 w-5 text-brand-navy/40" strokeWidth={1.5} />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="muted" className="mt-1">{fulfillmentLabel[item.fulfillmentType]}</Badge>
                  </div>

                  {item.fulfillmentType === "SHIP" ? (
                    <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Qty {item.quantity}</span>
                  )}

                  <p className="w-20 shrink-0 text-right text-sm font-semibold text-foreground">
                    ₹{((item.priceCents * item.quantity) / 100).toFixed(2)}
                  </p>

                  <button
                    aria-label="Remove item"
                    onClick={() => removeItem(item.productId)}
                    className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <Card className="h-fit">
          <CardContent className="p-6">
            <p className="font-serif text-lg font-medium text-brand-navy">Order summary</p>
            <div className="mt-4 flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground">₹{(subtotal / 100).toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Shipping and tax calculated at checkout.</p>
            <Separator className="my-4" />
            <div className="flex justify-between text-base font-semibold text-foreground">
              <span>Total</span>
              <span>₹{(subtotal / 100).toFixed(2)}</span>
            </div>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href="/checkout">
                Checkout <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
