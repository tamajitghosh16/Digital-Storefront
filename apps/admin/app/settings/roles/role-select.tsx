"use client";

import { useFormStatus } from "react-dom";
import { controlClass } from "@/components/ui";
import { changeStaffRole } from "./actions";
import { STAFF_ROLES } from "./schema";

const ROLE_LABEL: Record<(typeof STAFF_ROLES)[number], string> = {
  READER: "Read-only",
  SUPPORT: "Support",
  EDITOR: "Editor",
  OWNER: "Owner",
};

function Inner({ currentRole }: { currentRole: string }) {
  const { pending } = useFormStatus();

  return (
    <select
      name="role"
      defaultValue={currentRole}
      disabled={pending}
      aria-label="Role"
      onChange={(event) => {
        if (event.currentTarget.value !== currentRole) event.currentTarget.form?.requestSubmit();
      }}
      className={`${controlClass} max-w-[10rem] disabled:opacity-60`}
    >
      {STAFF_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABEL[role]}
        </option>
      ))}
    </select>
  );
}

/** Inline role picker for a staff row. Submitting it runs `changeStaffRole`. */
export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  return (
    <form action={changeStaffRole} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <Inner currentRole={currentRole} />
    </form>
  );
}
