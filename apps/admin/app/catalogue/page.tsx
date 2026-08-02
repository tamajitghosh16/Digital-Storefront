import Link from "next/link";
import type { ProductType } from "@repo/database";
import { prisma } from "@repo/database";
import { ButtonLink, EmptyState, PageHeader, Pill, Table, Thumb } from "@/components/ui";
import { LinkButton } from "@/components/form-controls";
import { toggleProductPublished } from "./actions";

// FR-11.1: CMS for creating/editing catalogue items (books, service packages, pricing, inventory).

const TYPE_LABEL: Record<ProductType, string> = {
  PHYSICAL_BOOK: "Printed book",
  EBOOK: "E-book",
  SERVICE_PACKAGE: "Service package",
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function CataloguePage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Books & products"
        description="Everything you sell: printed books, e-books, and self-publishing packages."
        action={<ButtonLink href="/catalogue/new">Add a book</ButtonLink>}
      />

      {products.length === 0 ? (
        <EmptyState
          title="Nothing in the shop yet"
          description="Add your first printed book, e-book, or service package. You can upload the front cover as part of the same form."
          action={<ButtonLink href="/catalogue/new">Add a book</ButtonLink>}
        />
      ) : (
        <Table
          head={
            <>
              <th colSpan={2}>Title</th>
              <th>Type</th>
              <th>Price</th>
              <th>Stock</th>
              <th>In the shop</th>
              <th className="text-right">&nbsp;</th>
            </>
          }
        >
          {products.map((product) => (
            <tr key={product.id}>
              <td className="w-14 pr-0">
                <Thumb src={product.coverImageUrl} alt="" />
              </td>
              <td>
                <Link href={`/catalogue/${product.id}`} className="font-semibold text-ink hover:text-brand hover:underline">
                  {product.title}
                </Link>
                <p className="text-[13px] text-ink-muted">{product.author}</p>
              </td>
              <td className="text-ink-muted">{TYPE_LABEL[product.type]}</td>
              <td className="tabular-nums">{money.format(product.priceCents / 100)}</td>
              <td className="tabular-nums text-ink-muted">{product.stockQty ?? "—"}</td>
              <td>
                <Pill tone={product.isPublished ? "on" : "off"}>{product.isPublished ? "Showing" : "Hidden"}</Pill>
              </td>
              <td className="text-right">
                <form action={toggleProductPublished.bind(null, product.id)}>
                  <LinkButton>{product.isPublished ? "Hide" : "Show"}</LinkButton>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
