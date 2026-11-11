# Morning Star Staff Apps

Staff apps hub for Morning Star Post Acute. The site root is the landing page
(installable as a home-screen PWA); each app lives at a subpath.

**Hub:** https://snbadger.github.io/morning-star-rounds/

## Design system

- `ms-ui.css` + `ms-ui.js` — the shared look (shadcn/ui-style tokens and components on the Jericho
  colors, Lucide icons with emoji fallbacks, toasts, sheets). Pages rebuilt on it: the hub and the
  Shower Sheet. Hub tiles get one color per task group (section 14 of the stylesheet).
- `ms-skin.css` — loads AFTER an app's own `<style>` and restyles the original staff-app template
  classes (header, card, btn, label/input, tabs, cat chips, toast) onto the same tokens. Used by
  Deep Cleaning, Floor Rounds, Room Changes, Skill Validation, Ideas, Repairs, Grievances.
- Bump the `?v=` query on a shared file whenever it changes. Dark mode is opt-in only.

## Sign-in and devices (ms-identity.js, 11/4/26)

- **One sign-in.** Staff tap their name from the Paycom roster (Supabase RPC `staff_roster()`:
  employee number, preferred name, department, position only). The pick is stored once in
  `localStorage.ms_user` and also written to every app's own name key (`sh_name`, `ii_name`/`ii_dept`,
  `rc_name`/`rc_dept`, `dc_name`, `fr_name`, `cv_name`), so apps — including the separate-repo Supply
  app — pick the person up without changing how they save. "My name isn't here" allows a typed name.
- **Apps** call `MS.identity.card()` from `identityView()` and `MS.identity.get()` in `saveIdentity()`;
  their original typed-name functions remain as `legacy*` fallbacks. Log out = `MS.identity.signOut()`,
  which clears every app's keys and returns to the hub.
- **Device modes.** Personal phones (default) remember the person. The six roaming **shared iPads**
  are set once: on the hub tap the footer address 5 times → leadership PIN → "Shared iPad". Shared mode:
  tap-your-name per user, "Still here?" warning at 4:30 and automatic sign-out at 5 minutes idle,
  leadership PIN never saved (session only), HR gate hidden, low-use tools under "More tools",
  bigger tiles.
- **Ask once, at the hub (v2, 11/5/26).** The hub opens "Who are you?" when nobody is signed in:
  every time on a shared iPad, once per visit on a phone. The pick also fills the in-service quiz
  (`dq_fac`/`dq_name`) and Annual Review board (`ae_name`) keys, so those separate-repo apps skip
  their own name lists. A phone that saved one typed name in an older app is matched to the
  roster and signed in silently (two different names = ask). Supply's and the quiz's own Log out
  buttons now sign out everywhere (`ms_lv` marker: `ii_name` or `dq_name` missing ⇒ sign out).
- **Leadership apps** (My Work, Room Rounds, Staff Reliability, Standup Log) load ms-identity.js and
  pick the signed-in leader from their own lists with `MS.identity.matchName()` — full name, or same
  last name and first three letters ("Yesenia" = "Yessi"). The PIN is still asked; their Log out
  also signs out of the hub.
- **Navigation bar (ms-nav.js, 11/5/26).** Every in-repo app loads `ms-nav.js` (defer, end of body): a
  bottom bar with Back · All apps · Log out, because the shared iPads run from the Home Screen with no
  browser back button. Back returns to the previous screen for apps built on a global `view` + `render()`;
  apps with other screen state define `window.msNavBack()` (My Work, Standup Log, Room Rounds — step by
  step — and Staff Reliability). On the first screen Back goes to the hub. An app with its own bottom
  tab bar (Shower Sheet) gets the three buttons merged into that bar. New apps: add the script tag.
- **Repairs status + notes (11/5/26).** Open Repairs cards show status (New / In progress / Waiting on
  parts) and the latest notes; "Update status / add note" saves through RPC `repair_update(p_pin, p_actor,
  p_id, p_status, p_note)` (leadership PIN). Notes are `[MM/DD Name] …` lines in
  `equipment_repairs.work_notes`; a note saved here also lands on the repair's My Work item, and notes
  added in My Work copy back (trigger `trg_repair_notes_from_work`). `waiting` is repair-only (My Work
  shows it as in progress). Hub "Open repairs" counts new + in progress + waiting.
- **Shower Sheet** also stores `shower_logs.employee_number` for clean audit joins.
- **Shout Outs** live inside Ideas (Shout Out + Wall tabs); `/shoutouts/` redirects.

## Hub registry

`apps.json` is the single list of apps. `python3 tools/build_hub.py` regenerates the hub tiles
(`index.html`, from `tools/hub.template.html`) and the App Registry table below. Edit `apps.json` or the
template, never the generated parts. `--check` reports drift.

## App Registry

<!-- REGISTRY:START (generated from apps.json by tools/build_hub.py) -->
| App | URL | Audience | Data | Status |
|-----|-----|----------|------|--------|
| Staff Apps Hub | `/` (this repo root) | Everyone | — (static links) | Live |
| Shower Sheet | `/showers/` | CNAs | Supabase `shower_logs` | Live — restyled on ms-ui.css 11/4/26 (compat layer in its `<style>` maps the old class names; off-schedule shower is a bottom-sheet bed picker, prompt() kept as fallback) |
| CNA Assignment Sheet | `/assignments/` | Charge nurses (roster edit = leadership PIN) | Supabase `cna_roster` (RPCs `get_cna_roster`, `save_cna_roster`); showers mirror `/showers/` SCHEDULE. Every print (`beforeprint`) logs the sheet — staff, beds, showers, 1:1s; never pending diagnostics — to `cna_assignment_prints` via write-only `log_cna_assignment_print`; `v_cna_assignment_prints_latest` = last print per date/shift (service role only) | Live — print log added 10/23/26 |
| Deep Cleaning | `/deep-cleaning/` | Housekeeping (sign in by name, `dc_name`) | Sebastian's paper Deep Clean Schedule: 26 bed-group slots, day N of the month = slot N, days 27–31 catch-up. Supabase `deep_cleans` (slot + date + checklist, no PHI; upsert on slot/date), `deep_clean_slots` (schedule — mirror of `SLOTS` in the page), `v_deep_clean_status` (this month: done / today / missed / upcoming / paper = before 10/22/26 go-live); every new entry emails Sebastian via `deep-clean-notify` (Resend, `deep_clean_recipients` in improvement_ideas_config, idempotent on `notify_sent_at`) | Live — added 10/22/26 |
| Floor Rounds | `/floor-rounds/` | Maintenance & EVS (Sebastian); sign in via hub roster | Supabase `floor_rounds` | Live |
| Dietary Sanitation Audit | `/dietary-audit/` | Dining Services (Dietary Manager / RD); sign in via hub roster | Supabase `dietary_sanitation_audits` (one row per facility + month; `results` item key → met / not_met / na, `comments`, `corrections` {action, goal_date, corrected}, `photos` item key → storage paths in private bucket `dietary-audit-photos`; score = met ÷ (met + not met), N/A excluded; <95% = dietary alert + `administrator_notified`). Anon read/insert/update for current and prior month only, no delete. Below 95%, trigger `trg_dietary_audit_retakes` maps Not Met items to dietary in-service modules (`dietary_audit_item_modules`: A→5, cooling items→4, B→2+3, C/D→10, E→11) into `dietary_retake_assignments`; they show as Refresher rows in the In-Service Quiz app (done = pass on/after assigned date) and edge fn `dietary-retake-notify` emails part-time dietary staff + `retake_notify_recipients` (`dining_quiz_config.retake_send_mode` live/test/dry). Every Finish (app sets `finished_at` + `finish_snapshot`) fires `trg_dietary_audit_summary` → edge fn `dietary-audit-summary` emails the Administrator (`audit_summary_recipients`, `audit_summary_mode`; idempotent per finish via `summary_sent_at`). Items mirror the paper form REVISED 10/15/25 (`SECTIONS` in the page — never renumber a key). No PHI | Built 11/11/26 — photos, automatic refresher in-services, Administrator summary email |
| Room Changes | `/room-changes/` | All staff | Supabase `room_changes` | Live |
| Equipment Repair | `/repairs/` | All staff | Supabase `equipment_repairs`; **Rentals tab** (10/29/26) logs rented equipment in `equipment_rentals` via `submit_equipment_rental` / `set_equipment_rental_status` (on rent → pickup called → returned), room/location only; `repair-notify` edge fn creates the Asana task in Maintenance & EVS (email to Sebastian removed 10/22/26) | Live |
| Resident Grievance | `/grievances/` | All staff; resident/family self-entry mode (hand over the device) | Supabase `grievances` (resident Last, F. + room #) → Asana task for SSD + email to SSD/Admin via grievance-notify | Live — added 9/22/26 |
| Supply Order | separate repo `morning-star-supply` | All staff search & add; `#admin` = ordering view (mark off + CSV) | Supabase `supply_requests` | Live |
| Ideas & Shout Outs | `/ideas/` | All staff | Supabase `improvement_ideas` → Asana; Shout Out tab writes `shoutouts` via `submit_shoutout` (folded in from `/shoutouts/` 11/4/26); Wall tab = public wall | Live |
| Employment Application | separate repo `morning-star-apply` | Applicants (hub tile = Refer a Friend share link) | Supabase → PDF to HR | Live |
| In-Service Quizzes | separate repo `dining-inservice-quiz` | Dietary / DSD | Resend email | Live |
| Annual Evaluation Feedback | separate repo `msa-annual-eval` | All staff | — | Live |
| My Work | `/my-work/` | Leadership (PIN on hub; same server-checked PIN as Standup Log, shares `su_pin`; own owner key `mw_owner`, auto-matched from `su_name`/`rl_name`/`ii_name` on first visit) | Supabase `action_items` (+ `owner_key`, `department`, `list_id`, `private`, `resident_ref`), `work_owners`, `work_departments`, `work_lists`; RPCs `work_*` (PIN-checked; private rows only for Stephen). Mine = overdue / today / this week / later / unassigned-in-my-department (Claim) / my lists / done this week; dept view by owner; Everyone (Stephen) by owner + unassigned by dept. Tap circle = done with 8-second Undo. Replaces Asana for dept-head action items; see `01_Work/Jericho/Daily_Management/My_Work/My_Work_Build_Plan_2026-11-02.md` | Built 11/2/26 — not yet on the hub |
| Transportation & Discharges | `/trips/` (`?tab=appt` or `?tab=dc`) | Leadership PIN (shares `su_pin`, `mw_owner`). Valerie Estrada and Lucy Malcolm schedule; the scheduler enters everything (no transport hand-off since Brenna left 11/5/26) | Supabase `resident_trips` (RLS on, anon revoked; room-bed + name code only, never a name). RPCs `trips_list`, `trips_save`, `trips_set_status` (PIN), `trips_board` (PIN or shared-iPad key from `ms_device_keys`, issued by `ms_device_key_issue` in hub device setup). A new discharge starts the 7-step SS discharge checklist in My Work (`work_lists` template `discharge`, owner = Social Services, `sync_status='local'` so it never goes to Asana). PCC ADT trigger `_trips_close_from_adt` marks a discharge done when PCC shows DD/DAMA from that room-bed. Hub banner + standup card show today and the next 7 days | Built 11/5/26 — replaces Appointment_Transportation_Tracker.xlsx |
| Admissions | `/admits/` | Leadership PIN (shares `su_pin`, `mw_owner`). Randy Bago (Admissions) enters once a referral is accepted and has a date | Supabase `resident_admits` (RLS on, anon revoked; room-bed + name code only, never a name). RPCs `admits_list`, `admits_save`, `admits_set_status` (PIN), `admits_board` (PIN or shared-iPad key). A new admission starts an 8-step readiness checklist in My Work (`work_lists` template `admission`; Business Office, Maintenance/EVS, Nursing ×2, Dietary, Admissions, Social Services, MDS; `sync_status='local'`). PCC ADT trigger `_admits_arrive_from_adt` marks it arrived on AA/RA/RL from that room-bed (±3 days). Hub "Arriving" list shows room-bed, type, time and readiness only (no name code) | Built 11/5/26 |
| Room Rounds | `/rounds/` | Leadership (PIN on hub) | Supabase `rounding_observations`, `action_items`; summary = rounds completed % + weekly compliance grid, Room Rounds button opens the form (Daily Board removed 10/29/26); "CNA Care" follow-ups → `DSD/IP` (Yessi), Nursing → Donna; LAL mattress setting miss → same-day Nursing action item + DON email via `lal-notify` | Live — moved from root 8/19/26; LAL check added 10/1/26 |
| Standup Log | `/standup/` | Leadership (PIN on hub; the app asks for the same PIN and checks it server-side) | Supabase `standup_tabs` (79 tabs from Mitchell's JERICHO-STANDUP workbook), `standup_entries`, `standup_checks`; falls write to `incidents`. RPCs `standup_*` (PIN-checked). Feeds the Standup Screen `/standup/screen.html` (`standup_live`; v3 10/27/26 = one-page TV card grid: status color + icon + word, 30-day census/falls and 14-day PPD/OT charts from `standup_auto_cache._trends`, grey clock badge when a feed is past its cadence or a department tab is not updated by 09:15) | Live — added 10/13/26 |
| Staff Reliability | `/reliability/` | Leadership (PIN on hub; same server-checked PIN as Standup Log, shares `su_pin`; own name key `rl_name`) | Supabase `ot_approvals` (OT review queue like Plaud review: each OT day found in punches becomes a card the morning after; dept heads see their own dept, DON/HR/Admin all; Randy, Belem, Annie, Valerie, Michael, Lucy view only (Activities OT → Stephen) (approver list enforced server-side in `reliability_config.ot_approvers`); tap a reason = approved, or Not approved, 6-second Undo; `reliability_ot_queue` / `reliability_decide_ot`; status approved/declined, source review/ahead; "Approve ahead of time" form kept), `reliability_callout_excuses` (DON/HR/Admin excuse a call-out), `reliability_config`; scoring in `v_reliability_daily` → `v_reliability_monthly` (clean month = ≥8 days worked, 0 unapproved OT, 0 Veras call-outs without a time-off code, 0 meal penalties, ≤1 missed punch from 10/1/26 — `missed_scoring_start` / `max_missed_punches`). Punch facts snapshot hourly (:20) into `reliability_daily_snap` / `reliability_shift_snap` via `reliability_refresh()` — anon RPCs have a 3s timeout. RPCs `reliability_*` (PIN-checked). Never returns Paycom punch comments | Built 10/29/26 — OT scored from 11/1/26 |
| Shower Sheet Audit | `/shower-audit/` | Leadership (PIN on hub) — DSD | Supabase `shower_logs` (anon read, read-only page); SCHEDULE mirrors `/showers/` | Built 10/21/26 |
| In-Service Completion | `/inservice-dashboard/` | Leadership (PIN on hub) — DSD | Supabase `v_dsd_*` views via `dining-quiz` edge fn | Live — added 9/17/26 |
| Skill Validation | `/competency/` | Leadership (PIN on hub, moved 8/19/26) | Supabase `competency_validations` | Live |
| Plaud Review | `/plaud/` | **Stephen only** — own PIN (4–8 digits, set on first visit, checked server-side, 5 misses = 1-hour lockout). Not on the hub. | Supabase `plaud_review_items` (loaded each morning by `01_Work/_System/scripts/plaud_review/load_plaud_review.py`), `plaud_review_routes`; RPCs `plaud_review_*`; Approve → `plaud-review-create` edge fn creates the Asana task after a 6-second undo window | Live — added 10/14/26 |
| The Jericho Road (NEO) | separate repo `jericho-road-onboarding` | New hires (personal links); `admin.html` for Kelsey/Yessi/Stephen behind the hub's HR PIN | Supabase | Live |
| Shout Outs | `/shoutouts/` | All staff | Supabase `shoutouts` | Folded into Ideas 11/4/26 — `/shoutouts/` is a redirect to `/ideas/#shoutout` (kept for printed QR codes) |
| Staffing Form Signatures (612) | `/form-signing/?t={token}` | Donna / Amandeep | Supabase | Live — personal links only, not on hub |
| Team Building Prep | `/teambuilding/` | Dept heads | — | One-time (July 2026), not on hub |
<!-- REGISTRY:END -->

## Notes

- The old "Room Rounds" QR code pointed at the root URL; it now lands on the hub,
  where Rounds is one tap away behind the Leadership PIN.
- PWA: `manifest.webmanifest` + `icon-192.png` / `icon-512.png`. Add to Home Screen
  on shared phones installs the hub as an app.
- When retiring an app, remove its hub tile and mark it here — then take down its
  posted QR codes.
