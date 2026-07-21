import { Html, Head, Body, Container, Heading, Text, Row, Column, Hr } from "@react-email/components";

interface OrderConfirmationProps {
  orderId: string;
  items: { title: string; quantity: number; priceCents: number }[];
  totalCents: number;
}

export function OrderConfirmation({ orderId, items, totalCents }: OrderConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f6f8" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading style={{ color: "#1b2a4a" }}>Thanks for your order</Heading>
          <Text>Order #{orderId} is confirmed. Here's your itemized receipt:</Text>
          {items.map((item, i) => (
            <Row key={i}>
              <Column>
                <Text>
                  {item.title} × {item.quantity}
                </Text>
              </Column>
              <Column align="right">
                <Text>₹{((item.priceCents * item.quantity) / 100).toFixed(2)}</Text>
              </Column>
            </Row>
          ))}
          <Hr />
          <Row>
            <Column>
              <Text style={{ fontWeight: "bold" }}>Total</Text>
            </Column>
            <Column align="right">
              <Text style={{ fontWeight: "bold" }}>₹{(totalCents / 100).toFixed(2)}</Text>
            </Column>
          </Row>
        </Container>
      </Body>
    </Html>
  );
}
