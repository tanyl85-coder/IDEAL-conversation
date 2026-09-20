# IDEAL growth conversations

A working development workspace grounded in the supplied `IDEAL_Proposed Edits_v2.pdf`.

## Product flow

1. Sign in with ChatGPT, then create an HR workspace or join with a single-use, seven-day invitation.
2. Select a leadership level, describe a real challenge and choose 3–5 attributes.
3. Reflect against the official descriptors with evidence. Explore strengths, possible overplay and possible underplay using separate coaching prompts.
4. Share with an assigned supervisor. Both perspectives remain distinct; the supervisor cannot change the officer’s evidence or self-rating.
5. Agree one or two observable growth actions, a work opportunity, success signals, supervisor support and a review date. Save the actions before the officer confirms agreement.
6. The assigned supervisor endorses the conversation and plan. Endorsement creates a locked snapshot; a subsequent progress review preserves that snapshot and reopens the plan for learning.

There is no composite score, ranking or automated employment decision. Leader’s dimensions are discussion lenses, not additional ratings. Ratings and coaching prompts are app guidance, not additions to the official framework.

## Records and access

Records persist in D1. Server-side authorization scopes records to the officer and, after sharing, their assigned supervisor. HR roles only receive aggregated development themes. A theme requires at least five distinct officers; repeated conversations do not inflate counts. HR can create role-specific invitations. Each authenticated account belongs to one workspace.

Hosting access and workspace membership are separate layers. The initial deployment is owner-private. Before colleagues can redeem workspace invitations, the owner must enable an appropriate Sites audience. This build uses ChatGPT identity; it does not integrate HTX SSO, ServiceNow, performance systems or a learning catalogue. No notifications are sent.

Sample mode uses fictional people and temporary in-memory state only. It never saves to the live database or grants real roles. The sample role switch is for exploring the experience.

## Source and checks

- Official descriptors: `lib/framework.json`, extracted by table column from the supplied PDF; all 15 attributes and three dimensions, across four levels.
- Coaching prompts: `lib/coaching.ts`.
- Workspace API and authorization: `app/api/workspace/route.ts`.
- Schema and migration: `db/schema.ts`, `drizzle/`.
- Isolated workflow and authorization checks: `node --experimental-vm-modules tests/workflow.mjs`.
- Build through the Sites build helper. Preserve the generated migrations and logical `DB` binding.

Local browser checks cover focus selection, reflection, action creation, saving, agreement and required endorsement observations. Workflow checks use in-memory SQLite and simulated dispatch identities, not real user accounts. The managed preview does not support WebMCP; that optional read-only integration is feature-detected and inactive when unsupported.
