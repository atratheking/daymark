# Validation and delivery status

## Executed locally

- Five task-model tests cover calendar/year/leap-year/daylight-saving boundaries, monthly clamping, recurring successor/reset/duplicate prevention, smart lists, quick capture, and valid/malformed backups.
- Production Vite build and desktop JavaScript syntax checks pass.
- UI checks exercised quick capture, note/subtask/recurrence editing, reload persistence, recurring-task completion, search, recoverable deletion/restoration, calendar rendering and habit check-in.
- Dark and light task workspaces were visually reviewed against the retained references. Pane geometry and selected blank-region colors were measured. Settings and packaged renderer checks confirmed the Daymark rename and removal of old status/provenance labels.
- The packaged macOS Apple Silicon app was launched and its native title/menu and ASAR renderer inspected.
- Both macOS arm64 and Windows x64 packages contain renderer bytes matching the final production build and exclude original app files/research captures.
- Generated Windows executable is PE32+ x86-64 GUI format.

## Not established

Windows runtime correctness; signed/notarized distribution; native drag behavior across all hosts; end-to-end OS file-picker import/export; completed focus-session behavior; native shortcut behavior; multi-day operation; exhaustive visual parity. A focus completion check was interrupted by a development-server restart, so its completion is not claimed.

CI tests the task model and production build. Passing CI does not establish Windows runtime or full TickTick parity.
