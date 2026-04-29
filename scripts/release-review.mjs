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

## Release Commands

\`\`\`bash
npm run lint
npm run typecheck
npm run test
npm run build
\`\`\`

## Functional Review

- [ ] Spotify import works
- [ ] Metadata fields save correctly
- [ ] Platform links resolve correctly
- [ ] Low-confidence links are flagged instead of auto-approved
- [ ] Admin can edit links manually
- [ ] Publish and unpublish work
- [ ] Public page loads correctly
- [ ] Outbound click tracking works
- [ ] Meta Pixel still fires correctly if enabled
- [ ] Analytics events still fire correctly

## Design Review

- [ ] Public page looks professional on mobile
- [ ] Artwork presentation is strong
- [ ] Service buttons align cleanly
- [ ] No box-in-box issues
- [ ] Admin spacing is consistent
- [ ] Forms are easy to scan
- [ ] Loading, success, and empty states look intentional

## Performance Review

- [ ] Public page feels fast
- [ ] Admin feels responsive
- [ ] Images are optimized
- [ ] Blocking client-side fetches are minimized
- [ ] Unresolved links do not block the page
- [ ] Mobile first view stays usable on slower devices

## Copy Review

- [ ] Labels are short
- [ ] Errors are direct
- [ ] Success messages are short
- [ ] Empty states are useful
- [ ] No filler or generic SaaS copy remains

## Reliability Review

- [ ] Provider failures degrade gracefully
- [ ] Missing links are handled safely
- [ ] Error messages are actionable
- [ ] Environment variables are validated
- [ ] A single provider failure does not crash the page

## Code Quality Review

- [ ] Changes are modular
- [ ] Types remain safe
- [ ] No unnecessary duplication
- [ ] Tests were updated where needed
- [ ] No hardcoded secrets
- [ ] Database changes are migration-backed

## Findings

| Severity | Area | Issue | Evidence | Recommended fix | Status |
| --- | --- | --- | --- | --- | --- |
| critical |  |  |  |  | open |
| high |  |  |  |  | open |
| medium |  |  |  |  | open |
| low |  |  |  |  | open |

## Notes

- Stable production URL:
  - https://mosh-to-smartlink.vercel.app
- Review exact platform links before approving medium-confidence matches.
- Wrong links are worse than missing links.
`;

writeFileSync(outputPath, markdown, "utf8");

console.log(outputPath);
