import { redirect } from "next/navigation";
import { getCurrentUser } from "@repo/auth/server";
import { Callout, PageHeader, Wrap } from "@/components/primitives";
import { AccountNav } from "@/components/account/account-nav";

// FR-5.2/FR-5.3: the account area requires sign-in. proxy.ts already
// redirects unauthenticated requests; this is the defence-in-depth check.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/account/library");

  const isAuthor = user.role === "SELF_PUB_AUTHOR";

  return (
    <>
      <PageHeader>
        <h1>{user.name || user.email}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-2.5 text-[17px] text-ink-muted">
          {isAuthor ? "Self-publishing author" : "Reader"}
          {isAuthor && <Callout>Publishing dashboard enabled</Callout>}
        </p>
      </PageHeader>

      <Wrap className="grid gap-8 pb-11 pt-8 min-[920px]:grid-cols-[216px_1fr] min-[920px]:items-start min-[920px]:gap-11">
        <AccountNav showPublishing={isAuthor} />
        <div className="min-w-0">{children}</div>
      </Wrap>
    </>
  );
}
