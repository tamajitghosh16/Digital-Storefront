import { Html, Head, Body, Container, Heading, Text } from "@react-email/components";

interface ProjectStatusChangedProps {
  bookTitle: string;
  status: string;
}

export function ProjectStatusChanged({ bookTitle, status }: ProjectStatusChangedProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f6f8" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading style={{ color: "#1b2a4a" }}>Project update: {bookTitle}</Heading>
          <Text>Your self-publishing project status changed to: {status}</Text>
        </Container>
      </Body>
    </Html>
  );
}
