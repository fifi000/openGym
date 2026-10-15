# Spec: Strive inspirations for openGym

## Purpose and audience

Improve openGym's day-to-day workout logging and training review using ideas verified in Strive 2.0.6, its bundled Flutter assets, and its public product and store descriptions. The primary user is Filip on the existing self-hosted openGym instance, used on phone and desktop.

## Features

1. Faster set entry: copy a field from a previous set or session, fill compatible remaining sets, and undo the bulk edit. Keep warm-ups, intensifier sets, and per-set progression targets intact unless the user explicitly selects them.
2. Exercise alternatives: save options against a routine slot and choose one during a workout. Continue each selected exercise's own history and progression; never copy a load or training max across different exercises by default.
3. Deload-aware review: record why a session or exercise is excluded from progression, show deload markers in relevant charts, and allow strength trends to omit marked deloads. Keep completed work in actual volume and attendance.
4. SBS cycle recap: summarize the completed cycle with per-lift performance, completed sessions, records, training-max changes, and Coach decisions. Show source sessions and avoid calling small samples a trend.
5. Home dashboard: let the user pin or hide existing useful cards, including a progress card for the current SBS cycle. Keep the existing one-column mobile layout.
6. Load calibration: offer a guided first-session calibration for exercises with no known working load. Do not alter exercises with known targets or existing history.
7. Exercise comparison: allow comparing two exercises on a compatible progress metric and date range in Stats. Label units and source values so different exercise types are not compared as if they were the same lift.
8. Workout milestone card: extend the existing workout image sharing with an optional card for a new PR or other logged milestone. Sharing stays user-initiated and excludes notes and private body measurements.
9. Plan sharing link: add an opt-in link alongside existing file export and print. Encode the plan in the link itself; do not upload plans to a new third-party service. The existing import confirmation remains the point where a shared plan enters user data.

## Acceptance criteria

- A user can copy weight, reps, or effort from the prior comparable set/session and apply a value to compatible sets. A bulk edit has one-step undo and does not silently overwrite incompatible set types.
- A routine slot can store exercise alternatives; choosing one during training logs the selected ID and uses that exercise's own prior values.
- A marked deload is distinguishable from generic `noProg`; charts can include or omit marked deload data without changing logged sets, volume totals, or workout attendance.
- Completing an SBS cycle produces a recap derived from its saved sessions and cycle decisions. Empty or incomplete cycles show their status and do not fabricate metrics.
- Home cards can be pinned or hidden, and the choices persist across reload and account sync. At least one SBS progress card is available when SBS is enabled.
- Calibration skips known loads, can be cancelled, and saves confirmed targets through the existing routine model.
- Stats can show two compatible exercise series together, with clear labels and an empty state if the selected metric cannot be compared.
- A user can generate a milestone image after a qualifying workout; ordinary workout sharing still works and private notes/body measurements are absent from the image.
- A plan link can be opened in a second browser, reviewed, and imported without a third-party service. Invalid or oversized links fail without changing saved data.
- Frontend/API checks and production image builds pass. The upgraded containers report healthy, `/api/health` returns `ok`, and the existing user can sign in and see existing routines and history after deployment.
- The change is deployed to the already-running instance at `http://192.168.0.234:8082`, using `/srv/containers/opengym/compose.yml`. Existing data under `/srv/containers/opengym/data` remains readable. Record the image IDs, health response, and rollback images in the final report.

## Research basis

APK `com.koalasoft.gymnasium`, version 2.0.6, build 125. JADX decompiled the Android integration and resources; Dart implementation details were checked from the bundled schema and strings in `libapp.so`. Publicly described comparison charts, pinned targets, copy/repeat number entry, plan links, workout milestone cards, and past-date plan summaries were compared with this branch. The existing research report records evidence, hashes, tool limits, and overlap with openGym: `docs/research/STRIVE_IMPROVEMENTS.md`.

## Exclusions

- No accounts, paid APIs, third-party storage, or new analytics.
- No automatic publication, release tag, or registry push. Build and deploy the server containers locally.
- No Apple Health/Health Connect feature work; openGym already supports Health Connect.
- No annual recap, theme editor, Android app icon switcher, running route card, or gesture-based numeric input. They are less useful here than reliable set entry and review.
- No changes to the homelab repository's unrelated work. The active deployment's Compose and data directory may be used only for this openGym deployment.

## Stack and startup

Keep the current stack: React 19/Vite frontend, plain Node API, and Docker Compose. Use existing frontend/API dependencies. Local development follows `CLAUDE.md`: frontend tests with `cd frontend && npm test`; API tests with `cd api && npm test`; production build with `cd frontend && npm run build`. Build the API and web images from this checkout, then update the active Compose service on the same host.

## Autonomy and deployment boundaries

The user approved the listed improvements, further APK research, and deployment. The live host is the current machine at `192.168.0.234`; Docker confirms the running project `opengym`, config `/srv/containers/opengym/compose.yml`, and healthy API at `/api/health`. Back up the existing openGym data before deployment, retain the current image IDs for rollback, and deploy only the openGym API/web services. Do not push, publish images, tag a release, or modify other services. No credentials are needed for the local Docker deployment.
