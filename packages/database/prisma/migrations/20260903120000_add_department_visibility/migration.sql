-- Visibility overrides for apps/web's hardcoded department-bar entries (the
-- five fixed business lines). Those aren't MenuCategory rows, so hiding one
-- from the storefront's top menu is recorded here, keyed by the stable slug
-- both apps agree on. No row = shown; hidden = true drops it from
-- buildDepartments().

-- CreateTable
CREATE TABLE "department_visibility" (
    "key" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_visibility_pkey" PRIMARY KEY ("key")
);
