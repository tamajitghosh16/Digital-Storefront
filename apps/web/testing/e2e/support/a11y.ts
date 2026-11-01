import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

/** WCAG 2.1 A + AA: the level Indian (GIGW) and most international guidelines ask for. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Accessibility bugs tolerated while a fix is on its way, so CI stays green —
 * anything not listed still fails. Each entry is a rule plus a substring of
 * the offending element's selector, and a reason. Empty is the goal: delete
 * an entry as soon as its fix lands.
 */
const KNOWN_VIOLATIONS: { rule: string; target: string; why: string }[] = [];

const isKnown = (rule: string, target: string) =>
  KNOWN_VIOLATIONS.some((known) => known.rule === rule && target.includes(known.target));

/**
 * Scans the page with axe-core. Serious and critical violations fail the
 * test unless listed in KNOWN_VIOLATIONS; minor and moderate ones are
 * attached to the report as a to-do list rather than blocking.
 */
export async function expectNoSeriousA11yViolations(page: Page, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  await testInfo.attach("axe-results.json", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  const blocking = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.map((n) => n.target.join(" ")).filter((target) => !isKnown(v.id, target)),
    }))
    .filter((v) => v.targets.length > 0);
  expect(blocking, `axe found serious accessibility problems on ${page.url()}`).toEqual([]);
}
