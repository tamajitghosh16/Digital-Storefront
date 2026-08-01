import { StatusPage } from "@/components/primitives/status-page";

export default function UnauthorizedPage() {
  return (
    <StatusPage
      glyph="⛨"
      code="Error 403"
      title="Not authorized"
      body="You don't have access to this page. If you think that's wrong, sign in with the account that owns it."
      tone="alert"
    />
  );
}
