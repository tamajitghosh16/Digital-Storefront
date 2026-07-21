import { redirect } from "next/navigation";
import { getCurrentUser } from "@repo/auth/server";
import { AccountNav } from "@/components/account-nav";

// FR-5.2/FR-5.3: account area requires sign-in. Middleware.ts already
// redirects unauthenticated requests, this is the defense-in-depth check.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/account");

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="font-serif text-2xl font-medium text-brand-navy">My account</p>
      <p className="mt-1 text-sm text-muted-foreground">{user.name || user.email}</p>

      <div className="mt-8 flex flex-col gap-8 sm:flex-row">
        <aside className="w-full shrink-0 sm:w-52">
          <AccountNav showPublishing={user.role === "SELF_PUB_AUTHOR"} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
