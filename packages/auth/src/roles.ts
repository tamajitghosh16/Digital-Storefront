/**
 * Role hierarchy and permission helpers shared by apps/web and apps/admin.
 * Mirrors the RBAC matrix in the Technical Design Document, Section 3.3.
 */
import type { Role } from "@repo/database";

export const ROLES = {
  GUEST: "GUEST",
  READER: "READER",
  SELF_PUB_AUTHOR: "SELF_PUB_AUTHOR",
  SUPPORT: "SUPPORT",
  EDITOR: "EDITOR",
  OWNER: "OWNER",
} as const satisfies Record<string, Role>;

/** Roles allowed into apps/admin. */
export const ADMIN_ROLES: Role[] = [ROLES.SUPPORT, ROLES.EDITOR, ROLES.OWNER];

/** Roles that may modify catalogue, pricing, and royalty configuration. */
export const CATALOGUE_WRITE_ROLES: Role[] = [ROLES.EDITOR, ROLES.OWNER];

/** Roles that may edit site-wide CMS content: site settings, navigation, homepage banners, FAQs, testimonials. */
export const CONTENT_WRITE_ROLES: Role[] = [ROLES.EDITOR, ROLES.OWNER];

/** Only the Owner (Publisher) may configure royalty rates and manage staff roles. */
export const OWNER_ONLY_ROLES: Role[] = [ROLES.OWNER];

export function isAdmin(role: Role | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function canWriteCatalogue(role: Role | null | undefined): boolean {
  return !!role && CATALOGUE_WRITE_ROLES.includes(role);
}

export function isOwner(role: Role | null | undefined): boolean {
  return !!role && OWNER_ONLY_ROLES.includes(role);
}

/**
 * Server Actions should call this at the top of every mutation — route-level
 * middleware guards are a UX nicety, not a security boundary. Throws if the
 * role check fails so the action aborts.
 */
export function assertRole(role: Role | null | undefined, allowed: Role[]) {
  if (!role || !allowed.includes(role)) {
    throw new Error(`Forbidden: role "${role ?? "none"}" is not permitted to perform this action.`);
  }
}
