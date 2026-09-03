import { redirect } from "next/navigation";
import { getCurrentStaff } from "@repo/auth/server";
import { PageHeader } from "@/components/ui";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
  const user = await getCurrentStaff();
  if (!user) redirect("/sign-in");

  return (
    <div className="max-w-xl">
      <PageHeader title="My account" description="Your sign-in details for the back office." />
      <AccountClient email={user.email} role={user.role} />
    </div>
  );
}
