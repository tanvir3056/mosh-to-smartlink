import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  "-",
  String(now.getHours()).padStart(2, "0"),
  String(now.getMinutes()).padStart(2, "0"),
].join("");

const outputDir = path.join(process.cwd(), "output", "reviews");
mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, `product-review-${timestamp}.md`);

const markdown = `# Product Review Report

Generated: ${now.toISOString()}

## Verification Evidence

\`\`\`bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
node scripts/qa-smoke.mjs basic
node scripts/qa-smoke.mjs email-capture
\`\`\`

| Evidence status | Gate | Proves |
| --- | --- | --- |
| Not run in this report | \`npm run lint\` | Code style and framework lint checks are clean. |
| Not run in this report | \`npm run typecheck\` | TypeScript contracts compile without errors. |
| Not run in this report | \`npm run test\` | Unit and integration behavior still passes. |
| Not run in this report | \`npm run build\` | Next.js production build succeeds. |
| Not run in this report | \`npm run test:e2e\` | Browser-level admin, public redirect, and email capture flows pass. |
| Not run in this report | \`node scripts/qa-smoke.mjs basic\` | Seeded public smart-link page loads and outbound redirect works. |
| Not run in this report | \`node scripts/qa-smoke.mjs email-capture\` | Seeded email capture flow stores lead attribution and unlocks the reward. |

Update the status column only after each command has been run in the current review window. Do not mark launch readiness from memory or from older command output.

## Functional Review

- [ ] Spotify import creates a private draft and opens the editor.
- [ ] Metadata fields save and survive reload.
- [ ] Platform links resolve or degrade to reviewable fallbacks.
- [ ] Low-confidence links are flagged instead of auto-approved.
- [ ] Admin can edit, hide, and re-show links manually.
- [ ] Publish is blocked until at least one valid visible destination is ready.
- [ ] Publish and unpublish update the public page correctly.
- [ ] Public page loads at \`/{username}/{slug}\`.
- [ ] Outbound click tracking works through \`/go/{username}/{slug}/{service}\`.
- [ ] Meta Pixel fires only when enabled.
- [ ] Analytics events appear in the dashboard.

## Design Review

- [ ] Approved public output pages still match the intended visual direction.
- [ ] Mobile first viewport keeps the main action above friction.
- [ ] Artwork presentation is strong and does not create layout shift.
- [ ] Service buttons align cleanly and remain readable.
- [ ] Admin spacing is consistent across overview, import, editor, analytics, and settings.
- [ ] Forms are easy to scan and have accessible labels.
- [ ] Loading, success, error, and empty states look intentional.

## Performance Review

- [ ] Public page feels fast on mobile.
- [ ] Admin feels responsive during import, save, and publish.
- [ ] Above-the-fold images are intentionally prioritized.
- [ ] Blocking client-side fetches are minimized.
- [ ] Unresolved links do not block rendering.
- [ ] Mobile first view stays usable on slower devices.

## Copy Review

- [ ] Labels are short and action-oriented.
- [ ] Errors are direct and actionable.
- [ ] Success messages are short.
- [ ] Empty states say what to do next.
- [ ] No prototype, provider-jargon, or generic SaaS filler remains in launch-facing surfaces.

## Reliability Review

- [ ] Provider failures degrade gracefully.
- [ ] Missing links are handled safely.
- [ ] Error messages are actionable.
- [ ] Environment variables are documented and validated where needed.
- [ ] A single provider failure does not crash the page.
- [ ] E2E tests start a controlled local-auth server unless reuse is explicitly requested.

## Code Quality Review

- [ ] Changes are modular.
- [ ] Types remain safe.
- [ ] No unnecessary duplication.
- [ ] Tests were updated where behavior changed.
- [ ] No hardcoded secrets.
- [ ] Database changes are migration-backed.

## Findings

| Severity | Area | Issue | Evidence | Recommended fix | Status |
| --- | --- | --- | --- | --- | --- |
| none logged | Current review | No findings recorded yet. Add rows only when there is concrete evidence. | Pending hands-on review. | Run the verification gates and browser review, then replace this row with real findings if any. | pending |

## Notes

- Treat the current worktree and command output as the evidence source.
- Review exact platform links before approving medium-confidence matches; wrong links are worse than missing links.
- If checking a deployed URL, record the exact URL and timestamp in this report.
`;

writeFileSync(outputPath, markdown, "utf8");

console.log(outputPath);
