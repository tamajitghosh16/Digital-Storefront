"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Vendor } from "@repo/database";
import { Search } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { EmptyState, Pill, Table, controlClass } from "@/components/ui";
import { LinkButton } from "@/components/form-controls";
import { toggleVendorActive } from "./actions";

export function VendorsList({ vendors }: { vendors: Vendor[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(q) ||
        (vendor.contactName?.toLowerCase().includes(q) ?? false) ||
        (vendor.city?.toLowerCase().includes(q) ?? false)
    );
  }, [vendors, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">All Vendors</p>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vendors"
            aria-label="Search vendors"
            className={cn(controlClass, "w-64 pl-9")}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No vendors match your search" : "No vendors yet"}
          description={query ? "Try a different name or city." : "Add the suppliers you order physical stock from."}
        />
      ) : (
        <Table
          head={
            <>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone / Email</th>
              <th>City</th>
              <th className="text-right">&nbsp;</th>
            </>
          }
        >
          {filtered.map((vendor) => (
            <tr key={vendor.id}>
              <td>
                <Link
                  href={`/supply/vendors/${vendor.id}`}
                  className="font-semibold text-ink hover:text-brand hover:underline"
                >
                  {vendor.name}
                </Link>
              </td>
              <td className="text-ink-muted">{vendor.contactName ?? "—"}</td>
              <td className="text-ink-muted">
                <div className="flex flex-col gap-0.5">
                  <span>{vendor.phone ?? "—"}</span>
                  {vendor.email && <span className="text-[12px]">{vendor.email}</span>}
                </div>
              </td>
              <td className="text-ink-muted">{vendor.city ?? "—"}</td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Pill tone={vendor.isActive ? "on" : "off"}>{vendor.isActive ? "Active" : "Inactive"}</Pill>
                  <form action={toggleVendorActive.bind(null, vendor.id)}>
                    <LinkButton>{vendor.isActive ? "Deactivate" : "Activate"}</LinkButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
