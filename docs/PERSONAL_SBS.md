# Personal SBS changes

The `codex/strive-sbs` branch starts at upstream commit `464355ef43d4c8f8a4e0bb6db9c2af7f240593b5`.
`origin` is the owner's fork. `upstream` is `DuarteSantos8/openGym`.

The three routine identities stay fixed. Each holds its four Strive templates in `sbsWeeks`.
`state.sbs` holds the cycle position, editable program maxes, rounding, coaching preference,
memory and decision history. A week advances after all three routines are completed, regardless
of calendar dates. Skipping or delaying a session does not advance the week.

The numeric cells of Bench 2x Int and Squat 1x Int Heavier define the baseline.
The latter's comments conflict with its edited cells and are not used. Bench test week uses
an opening single, not a promise that a particular weight is a max. Further attempts depend on
completed work. Historical missing RIR/RPE stays missing. Program maxes remain separate from
estimated and achieved records.

## Coach

`POST /api/sbs/prepare` reads recent training, the baseline, prior decisions, memory and selected
reference excerpts. Codex returns a JSON prescription. The server validates exercise identities,
loads, rep counts, row roles and reference IDs before the app applies it. The latest decision
can be undone before starting its session. Failure to reach Codex is labelled explicitly and
loads the workbook baseline. Chat answers do not silently alter a session.

The athlete authorizes automatic adaptation. Goals inferred from logs are hypotheses, not facts.
The coach must not invent readiness, pain, equipment, technique or effort. Books describe distinct
programs; their rules must not be mixed into SBS without a reason. Memory records observations,
hypotheses and athlete-stated facts. This is stored memory, not model training.

`SBS_KNOWLEDGE_DIR` points to a private directory containing `chunks.json` and `manifest.json`.
Chunks carry a book page or article URL. `scripts/training/import-web.mjs /private/knowledge`
refreshes the approved public sources manually. It needs the frontend's dev dependencies.
Some articles describe embedded videos. Their video transcripts are not included.
Books and training exports must never be committed or copied into the web image.

The Coach uses `gpt-6.1-sol` with medium reasoning by default. The athlete can choose another supported Codex model in Training maxes & preferences. Each prepared routine makes one model request; chat replies also use Codex. The Coach reads the Codex account rate-limit snapshot separately and shows remaining five-hour and weekly windows. Refreshing this snapshot does not start a model response.

Codex runs under the unprivileged `coach` user. Each profile has a separate login directory
under `COACH_CREDENTIAL_DIR`. Credentials stay outside the workout-data backup directory.
Use a fresh login with `codex login --device-auth`; never paste credentials into code or chat.
The app reports whether the profile has a login cache. A completed inference is the actual
check that the account and usage limits permit a request.

## Workout and records

List view has a Previous column matched to the same routine and to warmup/work-set position.
Tap an exercise name to open its history. The 1–12 table supports all time, year, six months,
quarter and custom dates. Achieved records require exactly that rep count. Warmups, failed,
partial, negative, drop and cluster sets do not produce rep-max records.

Count volume ×2 changes volume only, never logged load or maxes. The setting can be edited in
exercise details. Dumbbell weights stay in the athlete's recorded convention. Weighted
bodyweight uses added load. Estimates for it require a bodyweight on the source workout and
subtract that mass once when displaying estimated added load.

## Updating from the author

Do not point the running deployment at `latest` and do not overwrite this branch with upstream.

1. Back up the workout data and record the currently deployed image digests.
2. `git fetch upstream` and create an integration branch from the deployed personal branch.
3. Merge the intended upstream tag or commit. Resolve conflicts in the personal changes.
4. Run the frontend tests, API tests and production build. Test session start/finish, history,
   sync and a real sourced Codex decision against a copy of the data.
5. Build versioned images and test them without exposing or overwriting production data.
6. Deploy the chosen image versions. Keep the previous images and backup for rollback.

Data migration is a separate operation from updating code. Never reimport the original Strive
backup over new openGym workouts during an update.
