import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface StaffInviteProps {
  name: string;
  inviteUrl: string;
  invitedByEmail: string;
  expiresInMinutes: number;
}

export function StaffInvite({ name, inviteUrl, invitedByEmail, expiresInMinutes }: StaffInviteProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f6f8" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading style={{ color: "#1b2a4a" }}>You&rsquo;ve been invited to the back office</Heading>
          <Text>
            Hello {name}, {invitedByEmail} has invited you to Shashibhushan&rsquo;s New School Book Press back office.
            Use the button below to choose a password and finish setting up your account.
          </Text>
          <Button
            href={inviteUrl}
            style={{
              backgroundColor: "#1b2a4a",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "6px",
              fontWeight: "bold",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Set your password
          </Button>
          <Text style={{ color: "#64748b", fontSize: "13px" }}>
            This link works once and expires in {expiresInMinutes} minutes. If it expires, ask for a new invite.
          </Text>
          <Hr />
          <Text style={{ color: "#64748b", fontSize: "12px", wordBreak: "break-all" }}>
            If the button doesn&rsquo;t work, paste this address into your browser:
            <br />
            {inviteUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
