import Link from "next/link";
import { BookX } from "lucide-react";
import { Button } from "@repo/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-5 text-center sm:px-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy-50">
        <BookX className="h-6 w-6 text-brand-navy" strokeWidth={1.75} />
      </div>
      <h1 className="mt-5 font-serif text-2xl font-medium text-brand-navy">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist, or may have been moved.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
