<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project-Specific Agent Directives for SajiloResQ

## 1. Database and Backend (Supabase)
When interacting with the database, generating queries, or validating backend logic, you MUST ALWAYS utilize the `supabase-SajiloRes` MCP server.
The Supabase connection details are available in `.env.local`. Ensure that:
- You utilize `NEXT_PUBLIC_SUPABASE_URL` (`https://bdofvgkjhbcddmenvjyi.supabase.co`)
- You use `SUPABASE_SERVICE_ROLE_KEY` for administrative tasks, schema introspection, and direct database queries if required via MCP.
- You adhere strictly to the schema provided in `supabase/migrations/20260920000000_init.sql` and use the MCP to verify live database state.

## 2. Frontend and Landing Page Development
When building the website and specifically the landing page (`app/page.tsx`), you are FORCED to incorporate all of the requested tools and libraries:
- **GSAP**: Use for custom scroll animations, timelines, and precise scroll-triggered timing control.
- **MagicUI**: Use their pre-built, highly polished animated UI components.
- **Scroll-Craft**: Follow the specific, premium scroll-driven principles from the `scroll-craft` skill (e.g., dimensional layering, signature move, varying devices per act, avoiding repetitive scroll chains). You MUST read `.agents/skills/scroll-craft/SKILL.md` before making any layout decisions.
- **Agent-Reach**: Use Agent-Reach (`~/.agent-reach/`) and its tools for giving the system/agent internet access (search, fetching updated component docs from GitHub, Reddit, etc.) when resolving implementation ambiguities or retrieving live context.

Failure to use these installed repositories in the UI implementation violates the core project requirements.
