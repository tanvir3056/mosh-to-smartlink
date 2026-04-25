from __future__ import annotations

from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, StyleSheet1, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_FILE = OUTPUT_DIR / "ffm-project-review.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 18 * mm
RIGHT_MARGIN = 18 * mm
TOP_MARGIN = 18 * mm
BOTTOM_MARGIN = 16 * mm
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN


def build_styles() -> StyleSheet1:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DocTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11.5,
            leading=16,
            textColor=colors.HexColor("#475569"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16.5,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=4,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SubTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=17,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=4,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10.2,
            leading=15,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyTight",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.8,
            leading=13.5,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Small",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=12,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BoxBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.6,
            leading=13.8,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.9,
            leading=12,
            textColor=colors.HexColor("#111827"),
            spaceAfter=0,
        )
    )
    return styles


def page_decorations(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(doc.leftMargin, 9 * mm, "FFM project review")
    canvas.drawRightString(PAGE_WIDTH - doc.rightMargin, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


def box(text: str, styles: StyleSheet1, fill: str = "#f8fafc") -> Table:
    paragraph = Paragraph(text, styles["BoxBody"])
    table = Table([[paragraph]], colWidths=[CONTENT_WIDTH])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(fill)),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#d7e0ea")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def simple_table(
    headers: list[str],
    rows: Iterable[list[str]],
    widths: list[float],
    styles: StyleSheet1,
) -> Table:
    data: list[list[Paragraph]] = [
        [Paragraph(f"<b>{header}</b>", styles["TableCell"]) for header in headers]
    ]
    for row in rows:
        data.append([Paragraph(cell, styles["TableCell"]) for cell in row])

    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d7dee7")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def add_bullets(story: list, styles: StyleSheet1, items: Iterable[str]) -> None:
    for item in items:
        story.append(Paragraph(f"- {item}", styles["Body"]))


def add_numbered(story: list, styles: StyleSheet1, items: Iterable[str]) -> None:
    for index, item in enumerate(items, start=1):
        story.append(Paragraph(f"{index}. {item}", styles["Body"]))


def add_tool_card(
    story: list,
    styles: StyleSheet1,
    name: str,
    what_it_is: str,
    why_used: str,
    in_project: str,
    examples: str,
) -> None:
    story.append(Paragraph(name, styles["SubTitle"]))
    story.append(
        box(
            (
                f"<b>What it is:</b> {what_it_is}<br/><br/>"
                f"<b>Why we used it:</b> {why_used}<br/><br/>"
                f"<b>In this project:</b> {in_project}<br/><br/>"
                f"<b>Typical actions:</b> {examples}"
            ),
            styles,
        )
    )
    story.append(Spacer(1, 7))


def build_story(styles: StyleSheet1) -> list:
    story: list = []

    story.append(Paragraph("FFM Project Review", styles["DocTitle"]))
    story.append(
        Paragraph(
            "What we built, what each tool was doing, where issues usually live, and how to prompt better next time.",
            styles["DocSubtitle"],
        )
    )
    story.append(
        box(
            (
                "<b>What this review is based on:</b> the current repository, README, package.json, database migrations, "
                "runtime code, and git history.<br/><br/>"
                "<b>Important limit:</b> I could not directly inspect a complete archive of all earlier chat transcripts from this workspace, "
                "so the prompting analysis is an inference from the implementation history and the later refinement passes."
            ),
            styles,
            fill="#eef6ff",
        )
    )
    story.append(Spacer(1, 10))
    story.append(Paragraph("Executive Summary", styles["SectionTitle"]))
    story.append(
        Paragraph(
            "You have a real working product here, not a prototype. The repo shows a music smart-link platform where an artist or team member can create an account, import a released Spotify track, review and edit service destinations, upload or crop artwork, publish a page at a per-user URL, and then monitor visits and outbound clicks in an analytics dashboard.",
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            "The project grew beyond its earliest single-admin shape. The code and migrations now show multi-account support, per-user public routing, tracked redirect links, first-party analytics, and production-oriented handling for Vercel, Supabase Auth, Supabase Storage, and Postgres connections.",
            styles["Body"],
        )
    )
    add_bullets(
        story,
        styles,
        [
            "The public experience is the release page at /username/song-slug.",
            "The private experience is the dashboard that imports, edits, previews, publishes, and measures pages.",
            "Local development can run with fallback auth and an embedded Postgres-compatible database.",
            "Production uses Supabase-backed auth, database connectivity, and artwork storage.",
        ],
    )

    story.append(PageBreak())

    story.append(Paragraph("What We Achieved", styles["SectionTitle"]))
    add_bullets(
        story,
        styles,
        [
            "Built a full-stack release-link product rather than a static landing page.",
            "Added multi-account support so the app is not limited to one global admin anymore.",
            "Created per-user public routes, which is a meaningful product upgrade and not just UI polish.",
            "Implemented import, review, preview, publish, unpublish, and delete flows for songs.",
            "Added first-party analytics for visits, unique visitors, outbound clicks, referrers, UTM data, devices, country, and city when available.",
            "Added manual artwork crop and upload handling, then moved uploaded artwork into Supabase Storage for production use.",
            "Hardened database handling for Vercel serverless behavior, especially connection limits and pooled connections.",
            "Kept local development friendly by supporting demo auth and an in-memory local database when production services are absent.",
        ],
    )

    story.append(Paragraph("Milestones Visible In Git History", styles["SubTitle"]))
    add_bullets(
        story,
        styles,
        [
            "<b>Deploy-ready app</b>: the project crossed from concept into something meant to ship.",
            "<b>Harden database connections for Vercel</b>: production stability work started showing up.",
            "<b>Add multi-account flow and new public routing</b>: the product widened from one-admin thinking to real user ownership.",
            "<b>Add manual artwork crop editor</b> and <b>Improve artwork crop editor</b>: editing quality and content control became important.",
            "<b>Store manual artwork uploads in Supabase Storage</b>: media handling moved from temporary/local behavior toward production behavior.",
        ],
    )
    story.append(
        box(
            (
                "<b>Plain-English reading of that history:</b> the product idea landed early, then the real effort moved into production hardening, multi-user support, analytics quality, and artwork experience. "
                "That is exactly what mature projects tend to look like."
            ),
            styles,
            fill="#f5fbea",
        )
    )

    story.append(Spacer(1, 8))
    story.append(Paragraph("Core Terms In Plain English", styles["SubTitle"]))
    glossary = simple_table(
        headers=["Term", "Meaning"],
        rows=[
            ["Local", "The version running on your own computer while you build and test."],
            ["Production", "The live internet version that real visitors use."],
            ["Route", "A URL path, such as /admin or /username/song-slug."],
            ["Build", "The process that checks and prepares the app for deployment."],
            ["Deploy", "Pushing a built version of the app to a hosting platform such as Vercel."],
            ["Migration", "A SQL file that changes the database structure in a controlled way."],
            ["Environment variable", "A setting or secret that changes by environment without changing the code."],
            ["Storage bucket", "A managed place to store files such as uploaded artwork."],
        ],
        widths=[CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.78],
        styles=styles,
    )
    story.append(glossary)

    story.append(PageBreak())

    story.append(Paragraph("The Tools We Were Using", styles["SectionTitle"]))
    story.append(
        Paragraph(
            "Below is the non-technical version of the stack, with a focus on what each tool did for you in practice.",
            styles["Body"],
        )
    )

    add_tool_card(
        story,
        styles,
        "Codex",
        "The coding agent that turned prompts into file edits, commands, tests, and implementation decisions.",
        "It was the operator. Your prompts were the direction, and Codex translated that direction into concrete changes.",
        "The quality of the result depended a lot on how clearly the prompt described the goal, the constraints, and the desired taste.",
        "Ask for changes, explanations, debugging help, summaries of files changed, and a verification report.",
    )
    add_tool_card(
        story,
        styles,
        "Terminal",
        "A text-based control panel for your machine.",
        "It is the fastest place to start the app, run checks, inspect errors, view files, and manage git.",
        "If something fails before the browser even loads, the terminal usually shows the first useful clue. It is also where commands like npm run dev, npm run build, and git status happen.",
        "Start the app, run tests, inspect output, seed users, and verify whether the problem is local or production-only.",
    )
    add_tool_card(
        story,
        styles,
        "Git",
        "The version history system underneath the project.",
        "It lets you save checkpoints, compare what changed, and trace how the app evolved over time.",
        "The current history clearly shows the app moving through deployment hardening, multi-account work, analytics improvements, and artwork tooling.",
        "Use git status to see changes, git log to see milestones, and commits as safe restore points.",
    )
    add_tool_card(
        story,
        styles,
        "GitHub",
        "The online home for a Git repository.",
        "It is usually the shared source of truth, remote backup, collaboration surface, and often the thing Vercel deploys from.",
        "I can see origin/main in the local git history, so it is reasonable to infer that GitHub was the hosted remote backing this project.",
        "Push branches, open pull requests, review change history, and connect the repo to deployment.",
    )
    add_tool_card(
        story,
        styles,
        "Vercel",
        "The hosting and deployment platform that runs the Next.js app on the internet.",
        "It is a natural fit for Next.js, and this codebase explicitly includes Vercel-aware behavior such as geo headers and careful serverless database connection limits.",
        "The app likely deploys from the git remote, uses environment variables configured in Vercel, and benefits from Vercel request headers for location enrichment in analytics.",
        "Set env vars, trigger deployments, inspect build logs, and compare local behavior with live behavior.",
    )
    add_tool_card(
        story,
        styles,
        "Supabase",
        "A managed backend platform built around Postgres, Auth, and Storage.",
        "It avoided the need to build auth, file storage, and hosted database infrastructure from scratch.",
        "In this app it handles production authentication, database-related connection strings, admin and user provisioning, and the storage bucket for uploaded artwork.",
        "Create the project, set keys, run migrations, inspect auth users, and confirm storage buckets and policies.",
    )
    add_tool_card(
        story,
        styles,
        "Environment Variables",
        "Settings that live outside the code, often secrets or environment-specific values.",
        "The same app needs different credentials and URLs locally and in production.",
        "This project depends heavily on values like POSTGRES_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL, and ADMIN_EMAIL.",
        "If local and production behave differently, env vars are one of the first places to inspect.",
    )

    story.append(PageBreak())

    story.append(Paragraph("How The Pieces Fit Together", styles["SectionTitle"]))
    story.append(
        box(
            (
                "<b>Architecture in one line:</b><br/>"
                "Browser -> Vercel/Next.js app -> Supabase Auth, Postgres data, and Supabase Storage"
            ),
            styles,
            fill="#eef6ff",
        )
    )
    story.append(Spacer(1, 9))
    story.append(Paragraph("Typical Product Flow", styles["SubTitle"]))
    add_numbered(
        story,
        styles,
        [
            "You or an artist signs in through the app. In production that goes through Supabase Auth. In local development it can fall back to local demo auth when the Supabase auth settings are not present.",
            "A Spotify track is imported from the admin flow. The app creates or updates song records, a public page record, and streaming link records in the database.",
            "The editor lets you review metadata, adjust service destinations, and manage artwork.",
            "When the page is published, it becomes available at a per-user public path such as /username/song-slug.",
            "A visitor lands on that public page. The app can track the visit, UTM values, referrer, device summary, and location headers when the host provides them.",
            "If the visitor taps a streaming service, the request first hits a tracked redirect route. The app records the click, then redirects the visitor to the final destination.",
            "The dashboard reads those stored visits and clicks back out of the database so the owner can see performance by song, service, campaign, referrer, device, and date range.",
        ],
    )

    story.append(Paragraph("Why Local And Production Can Feel Different", styles["SubTitle"]))
    add_bullets(
        story,
        styles,
        [
            "If POSTGRES_URL is missing locally, the app uses an embedded Postgres-compatible fallback instead of the production database.",
            "If Supabase auth keys are missing locally and the app is not in production, the app can use a local demo auth path.",
            "Production depends on real environment variables, real networked services, and Vercel runtime conditions, so a bug may appear only after deployment.",
            "This means 'works locally' does not always mean 'production is configured correctly'.",
        ],
    )

    story.append(Paragraph("Useful Terminal Commands In This Repo", styles["SubTitle"]))
    command_table = simple_table(
        headers=["Command", "Why it matters"],
        rows=[
            ["<font name='Courier'>npm run dev</font>", "Starts the local development server so you can use the app in the browser."],
            ["<font name='Courier'>npm run build</font>", "Checks whether the app can build in a production-like mode."],
            ["<font name='Courier'>npm run test</font>", "Runs automated tests for logic and component behavior."],
            ["<font name='Courier'>npm run test:e2e</font>", "Runs browser-level end-to-end tests."],
            ["<font name='Courier'>git status</font>", "Shows what has changed and whether the worktree is clean."],
            ["<font name='Courier'>git log --oneline --decorate -n 20</font>", "Shows recent milestones in the project history."],
            ["<font name='Courier'>npm run seed:admin -- &lt;email&gt; &lt;password&gt;</font>", "Creates or updates a user account for local mode or Supabase-backed mode."],
        ],
        widths=[CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.66],
        styles=styles,
    )
    story.append(command_table)

    story.append(PageBreak())

    story.append(Paragraph("How To Debug Without Being Deeply Technical", styles["SectionTitle"]))
    story.append(
        Paragraph(
            "The fastest way to debug is not to read every file. It is to identify which layer owns the problem.",
            styles["Body"],
        )
    )
    debug_table = simple_table(
        headers=["Symptom", "Likely layer", "First places to look"],
        rows=[
            [
                "The site will not start locally.",
                "Terminal, scripts, or env setup",
                "Read the terminal output first. Then check package.json scripts, .env.local, and whether npm run dev is failing before the browser opens.",
            ],
            [
                "Sign-up or sign-in works locally but not on the deployed site.",
                "Supabase Auth or missing production env vars",
                "Check src/lib/auth.ts, src/lib/env.ts, and the Vercel environment variables for Supabase URL, anon key, and service role key.",
            ],
            [
                "A public song page loads but looks wrong or missing.",
                "Public route and UI components",
                "Check src/app/[username]/[slug]/page.tsx and src/components/public/*. That is where the public page is assembled and rendered.",
            ],
            [
                "Artwork upload or crop behavior is broken.",
                "Storage plus admin UI",
                "Check src/lib/storage.ts and src/components/admin/artwork-upload-field.tsx. That is where upload handling and the editor experience live.",
            ],
            [
                "Clicks are not being tracked.",
                "Tracked redirect route and analytics code",
                "Check src/app/go/[username]/[slug]/[service]/route.ts and src/lib/analytics.ts. That is where click capture and request context are handled.",
            ],
            [
                "Dashboard numbers look wrong.",
                "Database queries and analytics aggregation",
                "Check src/lib/data.ts plus the analytics dashboard page. That is where records are queried and grouped back into totals and charts.",
            ],
            [
                "Everything worked locally but failed after deployment.",
                "Vercel runtime or production configuration",
                "Check Vercel build/runtime logs, production env vars, and src/lib/db/driver.ts, which has special handling for hosted Postgres and serverless connection limits.",
            ],
        ],
        widths=[CONTENT_WIDTH * 0.23, CONTENT_WIDTH * 0.24, CONTENT_WIDTH * 0.53],
        styles=styles,
    )
    story.append(debug_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Questions To Ask First", styles["SubTitle"]))
    add_bullets(
        story,
        styles,
        [
            "Is the issue local only, production only, or both?",
            "Can I reproduce it with one exact URL and one exact action?",
            "Which layer owns this: UI, route, auth, database, storage, analytics, or deployment?",
            "Did any environment variable change?",
            "What is the exact error in the terminal or deployment log?",
        ],
    )

    story.append(Paragraph("Mental Map Of The Codebase", styles["SubTitle"]))
    add_bullets(
        story,
        styles,
        [
            "Public pages: src/app/[username]/[slug]/page.tsx and src/components/public/*",
            "Tracked click redirect: src/app/go/[username]/[slug]/[service]/route.ts",
            "Admin screens: src/app/admin/* and src/components/admin/*",
            "Auth: src/lib/auth.ts",
            "Database access and queries: src/lib/data.ts and src/lib/db/driver.ts",
            "Analytics request parsing: src/lib/analytics.ts",
            "Artwork storage: src/lib/storage.ts",
            "Database schema: supabase/migrations/*",
        ],
    )

    story.append(PageBreak())

    story.append(Paragraph("Where The Prompting Probably Went Wrong", styles["SectionTitle"]))
    story.append(
        Paragraph(
            "I would not frame this as you 'failing'. The repo history looks like a very normal pattern for product and design work: the functional idea was strong, but the taste and interaction details were discovered through several later passes. That usually means the original brief described the outcome but not the exact design direction tightly enough.",
            styles["Body"],
        )
    )
    add_bullets(
        story,
        styles,
        [
            "The early brief likely said what the product should do, but not exactly how it should feel.",
            "There were probably not enough visual references or anti-references, so the model fell back to a generic safe UI.",
            "The prompt may have asked for implementation before the design direction was fully locked.",
            "Negative constraints were probably missing. Without those, the model may choose layouts or styling you strongly dislike.",
            "The brief may not have clearly separated must-keep behavior from free-to-change presentation.",
            "Mobile-first expectations may not have been specific enough for the first design pass.",
            "The back-and-forth suggests the prompt was doing discovery and execution at the same time, which is common but expensive.",
        ],
    )
    story.append(
        box(
            (
                "<b>What the git history suggests:</b> after the core product existed, multiple follow-up commits focused on analytics visuals, artwork framing, crop editing, uploaded artwork rendering, and storage behavior. "
                "That is a signal that the first pass solved capability faster than it solved craft."
            ),
            styles,
            fill="#fff8eb",
        )
    )

    story.append(Spacer(1, 8))
    story.append(Paragraph("Better Prompting Rules For Future Builds", styles["SubTitle"]))
    add_bullets(
        story,
        styles,
        [
            "Separate discovery from execution. If you are unsure about the visual direction, ask for two or three concepts in words before any code is written.",
            "Name the exact screen or route that is in scope. 'Improve the app' is too wide. 'Redesign the public song page only' is much better.",
            "Define the user and the moment. For example: 'mobile users arriving from paid social who already know the song'.",
            "Give references and anti-goals. Say what it should resemble and what it must not resemble.",
            "List what must keep working, such as analytics, routing, auth, or existing data structures.",
            "State responsive priority clearly. If mobile is the main surface, say that explicitly.",
            "Define success criteria. Explain what must feel improved when the work is done.",
            "Ask for a change summary and verification every time so you know what was touched and how it was checked.",
        ],
    )

    story.append(Paragraph("A Stronger Prompt Template For Codex", styles["SubTitle"]))
    prompt_block = """You are improving the public song page only.

Goal:
Increase confidence and click-through from paid social traffic.

Audience:
Mobile users who already know the song and want a fast service choice.

Scope:
Only the public song page and any components/styles it directly depends on.

Keep:
Existing analytics tracking, route structure, service data, and preview playback.

Change:
Visual direction, spacing, hierarchy, typography, artwork treatment, and CTA emphasis.

Avoid:
Generic SaaS dashboard styling, cramped cards, purple gradients, tiny text, and unnecessary motion.

References:
Give 2 to 3 clear visual references or brand adjectives.

Responsive priority:
Mobile first. Desktop still needs to feel premium.

Technical constraints:
Do not break auth, admin pages, analytics, or publishing flow.

Done when:
The page feels premium, the service choices are obvious immediately, and the layout looks intentional on mobile.

Before coding:
Show me 2 distinct design directions in words first, then implement the chosen direction."""
    story.append(
        Table(
            [[Preformatted(prompt_block, ParagraphStyle("Code", fontName="Courier", fontSize=8.5, leading=12, textColor=colors.HexColor("#0f172a")))]],
            colWidths=[CONTENT_WIDTH],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#d7e0ea")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            ),
        )
    )

    story.append(Spacer(1, 8))
    story.append(Paragraph("Operator Checklist", styles["SubTitle"]))
    add_numbered(
        story,
        styles,
        [
            "State the business goal in one sentence.",
            "Name the exact screen, route, or flow that should change.",
            "Say what must keep working.",
            "Give references and anti-goals.",
            "Pick whether you want discovery first or direct implementation.",
            "Ask which files changed and how the work was verified.",
            "Before deployment, ask whether local, build, and test checks passed.",
        ],
    )

    story.append(PageBreak())

    story.append(Paragraph("Bottom Line", styles["SectionTitle"]))
    story.append(
        Paragraph(
            "The strongest takeaway is that you already succeeded at the hard part: you pushed through the messy middle and ended up with a complete working solution. The back-and-forth was not proof that you were bad at prompting. It was mostly proof that design direction was under-specified at first, which is fixable.",
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            "If you want to orchestrate future work more independently, learn to think in layers. Ask yourself: is this a terminal issue, a code issue, a database issue, an auth issue, a deployment issue, or a design-brief issue? Once you can name the layer, debugging becomes dramatically easier.",
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            "If you later build a design GPT that writes prompts for Codex, make that GPT produce a structured brief with goal, audience, scope, references, anti-goals, constraints, and success criteria every single time. That one change would likely remove a large share of the early churn you experienced here.",
            styles["Body"],
        )
    )
    story.append(
        box(
            (
                "<b>Prepared from repo evidence on April 24, 2026.</b><br/>"
                "PDF generated specifically for this workspace so you have a beginner-friendly reference you can return to when operating, debugging, or briefing the next round of work."
            ),
            styles,
            fill="#eefbf5",
        )
    )
    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            "Generated file: output/pdf/ffm-project-review.pdf",
            styles["Small"],
        )
    )

    return story


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT_FILE),
        pagesize=A4,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title="FFM Project Review",
        author="Codex",
        subject="Project review and beginner-friendly tooling guide",
    )
    story = build_story(styles)
    doc.build(story, onFirstPage=page_decorations, onLaterPages=page_decorations)
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
