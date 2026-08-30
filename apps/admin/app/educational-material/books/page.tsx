import { prisma } from "@repo/database";
import { ButtonLink, PageHeader } from "@/components/ui";
import { bookCoverGradient } from "@/lib/book-cover";
import { BooksList } from "./books-list";

// FR-11.1: CMS for creating/editing the book catalogue (printed books and e-books).
// Service packages are managed through the same Server Actions but don't
// appear in this list — see apps/admin/CLAUDE.md's "catalogue CMS lives
// under Books" note.

export default async function BooksPage() {
  // The whole list is handed to a Client Component that searches and sorts
  // it in the browser, so the cap has to sit above the catalogue rather than
  // at a page boundary — at 100 it silently hid titles once the demo
  // catalogue (100 books) was seeded alongside anything added by hand.
  const rows = await prisma.product.findMany({
    // `type` alone used to be enough, but the other Educational Materials
    // lines (charts, worksheets, teaching materials) are also PHYSICAL_BOOK
    // for fulfilment — `productLine` is what keeps this list to books.
    where: { type: { in: ["PHYSICAL_BOOK", "EBOOK"] }, productLine: "BOOK" },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // A cover-less book is drawn as a gradient jacket in the list, the same
  // way apps/web draws it. The gradient isn't a column on Product, so it's
  // recomputed from the slug here and passed down — the Client Component
  // never imports the catalogue data.
  const products = rows.map((row) => ({ ...row, ...gradientKeys(row.slug) }));

  return (
    <div className="max-w-6xl pt-10">
      <PageHeader title="Books" action={<ButtonLink href="/educational-material/books/new">Add new book</ButtonLink>} />
      <BooksList products={products} />
    </div>
  );
}

function gradientKeys(slug: string): { coverFrom: string; coverTo: string } {
  const { from, to } = bookCoverGradient(slug);
  return { coverFrom: from, coverTo: to };
}
