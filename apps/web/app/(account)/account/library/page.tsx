import { Download, Library } from "lucide-react";
import { Card, CardContent } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { SAMPLE_LIBRARY_ITEMS } from "@/lib/sample-data";

// FR-8.2: instant digital delivery via the account library.
// Real download links are minted by GET /api/library/[assetId] (signed, expiring, entitlement-checked).
// Shows sample purchased titles so the layout can be reviewed without seeding orders.
export default function DigitalLibraryPage() {
  return (
    <div>
      <h1 className="font-serif text-xl font-medium text-brand-navy">Digital library</h1>

      {SAMPLE_LIBRARY_ITEMS.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Library className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              Your purchased e-books and delivered service files will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_LIBRARY_ITEMS.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div
                  className="flex h-24 w-full items-center justify-center rounded-lg text-lg font-semibold text-white/90"
                  style={{ backgroundImage: `linear-gradient(135deg, ${item.coverFrom}, ${item.coverTo})` }}
                >
                  {item.title
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">by {item.author}</p>
                {item.formats.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.formats.map((format) => (
                      <Badge key={format} variant="outline">{format}</Badge>
                    ))}
                  </div>
                )}
                <button
                  disabled
                  title="Sample data preview — no file to download"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-sm font-medium text-muted-foreground"
                >
                  <Download className="h-4 w-4" strokeWidth={1.75} /> Download
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
