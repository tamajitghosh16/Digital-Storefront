import type { Metadata } from "next";
import { getCurrentUser } from "@repo/auth/server";
import { SectionHead, TABLE_CLASS, TD_CLASS, ROW_TH_CLASS, TableWrap } from "@/components/primitives";
import { AddressBook } from "@/components/account/address-book";
import { getAddresses } from "@/lib/actions/addresses";

export const metadata: Metadata = { title: "Account details" };

// FR-5.2: the reader's profile. Editing is a Phase 0 stub — the fields
// below are read straight from the signed-in user record.
export default async function AccountDetailsPage() {
  const [user, addresses] = await Promise.all([getCurrentUser(), getAddresses()]);

  const rows: { term: string; detail: string }[] = [
    { term: "Name", detail: user?.name?.trim() || "Not set" },
    { term: "Email", detail: user?.email ?? "—" },
    {
      term: "Member since",
      detail: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
    },
  ];

  return (
    <section>
      <SectionHead title="Account details" standfirst="Your profile and sign-in email." />

      <TableWrap>
        <table className={TABLE_CLASS}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.term}>
                <th scope="row" className={ROW_TH_CLASS}>
                  {row.term}
                </th>
                <td className={TD_CLASS}>{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      <p className="mt-5 max-w-[52ch] text-sm text-ink-muted">
        Editing your profile from here is coming soon. For any change in the meantime, contact the Press and we&rsquo;ll
        update it for you.
      </p>

      <div className="mt-11">
        <SectionHead title="Saved addresses" standfirst="Add up to 5 delivery addresses to speed through checkout." />
        <AddressBook initialAddresses={addresses} />
      </div>
    </section>
  );
}
