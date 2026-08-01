import { StatusPage } from "@/components/primitives/status-page";

export default function NotFound() {
  return (
    <StatusPage
      glyph="▤"
      code="Error 404"
      title="We couldn't find that page"
      body="The page you're looking for doesn't exist, or may have been moved."
    />
  );
}
