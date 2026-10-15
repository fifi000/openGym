# Decisions

| time | step | decision | reason | alternative |
|---|---|---|---|---|
| 2026-10-15 | interview | Build on `codex/strive-sbs`, the current personal openGym branch | The user asked to improve the openGym instance running on this host; the branch already carries SBS integration | Start from upstream main |
| 2026-10-15 | deployment | Deploy local API/web images through `/srv/containers/opengym/compose.yml` at `192.168.0.234:8082` | Docker confirms the active Compose project and healthy `/api/health`; no remote credentials or registry publication are required | Push a release image |
| 2026-10-15 | data | Back up `/srv/containers/opengym/data` before deployment and keep the current image IDs for rollback | The running instance has a real account and training history | Deploy without a rollback copy |
| 2026-10-15 | Strive analysis | Treat Dart strings/schema as feature evidence, not recovered source code | JADX can decompile Android integration and resources, while Flutter business logic is compiled into `libapp.so` | Claim a full source decompilation |
| 2026-10-15 | set edits | Default bulk operations to compatible, unfinished work sets and provide Undo | Avoid accidental changes to warm-ups, completed work, and different set types | Apply to every row by default |
| 2026-10-15 | alternatives | Retain exercise-specific history and load when a routine slot changes exercise | Loads and training maxes are not interchangeable between lifts | Copy the original exercise load |
| 2026-10-15 | sharing | Keep plan links self-contained and user-initiated | The existing self-hosted privacy model should not require a new service | Store plans on a public server |
| 2026-10-15 | deployment scope | Update only openGym API and web; do not alter homelab configuration or other services unless required for this deployment | The homelab checkout has unrelated uncommitted changes | Rewrite the homelab compose file |
| 2026-10-15 | SBS Coach panel | Use a compact dashboard with week/status first, readable Codex usage, primary chat, and collapsible settings/history/memory | The panel needs clearer hierarchy while preserving all existing controls on phone and desktop | Put every setting in one dense view or make chat the only focus |
| 2026-10-15 | Coach chat context | Keep the visible thread in the current page session and send at most eight recent user/Coach messages, each capped at 2,000 characters | Follow-up questions need context while keeping requests bounded; saved coach memory remains the durable record | Persist the full transcript in workout profile data |
