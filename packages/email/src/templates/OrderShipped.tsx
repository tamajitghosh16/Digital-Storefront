import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

interface OrderShippedProps {
  orderRef: string;
  carrier: string;
  trackingNumber: string;
  ordersUrl?: string;
}

export function OrderShipped({ orderRef, carrier, trackingNumber, ordersUrl }: OrderShippedProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f6f8" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading style={{ color: "#1b2a4a" }}>Your order is on its way</Heading>
          <Text>
            Order {orderRef} has been handed to {carrier}. Your tracking number is <strong>{trackingNumber}</strong>.
          </Text>
          {ordersUrl ? (
            <>
              <Text>You can follow the parcel from your orders page:</Text>
              <Button
                href={ordersUrl}
                style={{
                  backgroundColor: "#007acc",
                  color: "#ffffff",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                }}
              >
                Track your order
              </Button>
            </>
          ) : (
            <Text>You can follow the parcel from My Orders in your account.</Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}
