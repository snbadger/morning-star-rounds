# Morning Star Staff Apps

Staff apps hub for Morning Star Post Acute. The site root is the landing page
(installable as a home-screen PWA); each app lives at a subpath.

**Hub:** https://snbadger.github.io/morning-star-rounds/

## App Registry

| App | URL | Audience | Data | Status |
|-----|-----|----------|------|--------|
| Staff Apps Hub | `/` (this repo root) | Everyone | — (static links) | Live |
| Shower Sheet | `/showers/` | CNAs | Supabase `shower_logs` | Live |
| CNA Assignment Sheet | `/assignments/` | Charge nurses (roster edit = leadership PIN) | Supabase `cna_roster` (RPCs `get_cna_roster`, `save_cna_roster`); showers mirror `/showers/` SCHEDULE. Every print (`beforeprint`) logs the sheet — staff, beds, showers, 1:1s; never pending diagnostics — to `cna_assignment_prints` via write-only `log_cna_assignment_print`; `v_cna_assignment_prints_latest` = last print per date/shift (service role only) | Live — print log added 10/23/26 |
| Room Changes | `/room-changes/` | All staff | Supabase `room_changes` | Live |
| Deep Cleaning | `/deep-cleaning/` | Housekeeping (sign in by name, `dc_name`) | Sebastian's paper Deep Clean Schedule: 26 bed-group slots, day N of the month = slot N, days 27–31 catch-up. Supabase `deep_cleans` (slot + date + checklist, no PHI; upsert on slot/date), `deep_clean_slots` (schedule — mirror of `SLOTS` in the page), `v_deep_clean_status` (this month: done / today / missed / upcoming / paper = before 10/22/26 go-live); every new entry emails Sebastian via `deep-clean-notify` (Resend, `deep_clean_recipients` in improvement_ideas_config, idempotent on `notify_sent_at`) | Live — added 10/22/26 |
| Resident Grievance | `/grievances/` | All staff; resident/family self-entry mode (hand over the device) | Supabase `grievances` (resident Last, F. + room #) → Asana task for SSD + email to SSD/Admin via grievance-notify | Live — added 9/22/26 |
| Ideas for Improvement | `/ideas/` | All staff | Supabase → Asana | Live |
| Skill Validation | `/competency/` | Leadership (PIN on hub, moved 8/19/26) | Supabase `competency_validations` | Live |
| In-Service Completion | `/inservice-dashboard/` | Leadership (PIN on hub) — DSD | Supabase `v_dsd_*` views via `dining-quiz` edge fn | Live — added 9/17/26 |
| Staff Reliability | `/reliability/` | Leadership (PIN on hub; same server-checked PIN as Standup Log, shares `su_pin`; own name key `rl_name`) | Supabase `ot_approvals` (OT review queue like Plaud review: each OT day found in punches becomes a card the morning after; dept heads see their own dept, DON/HR/Admin all; Randy, Belem, Annie, Valerie, Michael, Lucy view only (Activities OT → Stephen) (approver list enforced server-side in `reliability_config.ot_approvers`); tap a reason = approved, or Not approved, 6-second Undo; `reliability_ot_queue` / `reliability_decide_ot`; status approved/declined, source review/ahead; "Approve ahead of time" form kept), `reliability_callout_excuses` (DON/HR/Admin excuse a call-out), `reliability_config`; scoring in `v_reliability_daily` → `v_reliability_monthly` (clean month = ≥8 days worked, 0 unapproved OT, 0 Veras call-outs without a time-off code, 0 meal penalties, ≤1 missed punch from 10/1/26 — `missed_scoring_start` / `max_missed_punches`). Punch facts snapshot hourly (:20) into `reliability_daily_snap` / `reliability_shift_snap` via `reliability_refresh()` — anon RPCs have a 3s timeout. RPCs `reliability_*` (PIN-checked). Never returns Paycom punch comments | Built 10/29/26 — OT scored from 11/1/26 |
| Shower Sheet Audit | `/shower-audit/` | Leadership (PIN on hub) — DSD | Supabase `shower_logs` (anon read, read-only page); SCHEDULE mirrors `/showers/` | Built 10/21/26 |
| Equipment Repair | `/repairs/` | All staff | Supabase `equipment_repairs`; **Rentals tab** (10/29/26) logs rented equipment in `equipment_rentals` via `submit_equipment_rental` / `set_equipment_rental_status` (on rent → pickup called → returned), room/location only; `repair-notify` edge fn creates the Asana task in Maintenance & EVS (email to Sebastian removed 10/22/26) | Live |
| Shout Outs | `/shoutouts/` | All staff | Supabase `shoutouts` | Live |
| Room Rounds & Daily Board | `/rounds/` | Leadership (PIN on hub) | Supabase `rounding_observations`, `action_items`; LAL mattress setting miss → same-day Nursing action item + DON email via `lal-notify` | Live — moved from root 8/19/26; LAL check added 10/1/26 |
| Standup Log | `/standup/` | Leadership (PIN on hub; the app asks for the same PIN and checks it server-side) | Supabase `standup_tabs` (79 tabs from Mitchell's JERICHO-STANDUP workbook), `standup_entries`, `standup_checks`; falls write to `incidents`. RPCs `standup_*` (PIN-checked). Feeds the Standup Dashboard (`standup_live`) | Live — added 10/13/26 |
| Plaud Review | `/plaud/` | **Stephen only** — own PIN (4–8 digits, set on first visit, checked server-side, 5 misses = 1-hour lockout). Not on the hub. | Supabase `plaud_review_items` (loaded each morning by `01_Work/_System/scripts/plaud_review/load_plaud_review.py`), `plaud_review_routes`; RPCs `plaud_review_*`; Approve → `plaud-review-create` edge fn creates the Asana task after a 6-second undo window | Live — added 10/14/26 |
| Staffing Form Signatures (612) | `/form-signing/?t={token}` | Donna / Amandeep | Supabase | Live — personal links only, not on hub |
| Team Building Prep | `/teambuilding/` | Dept heads | — | One-time (July 2026), not on hub |
| Supply Order | separate repo `morning-star-supply` | All staff search & add; `#admin` = ordering view (mark off + CSV) | Supabase `supply_requests` | Live |
| In-Service Quizzes | separate repo `dining-inservice-quiz` | Dietary / DSD | Resend email | Live |
| Annual Evaluation Feedback | separate repo `msa-annual-eval` | All staff | — | Live |
| The Jericho Road (NEO) | separate repo `jericho-road-onboarding` | New hires (personal links); `admin.html` for Kelsey/Yessi/Stephen behind the hub's HR PIN | Supabase | Live |
| Employment Application | separate repo `morning-star-apply` | Applicants (hub tile = Refer a Friend share link) | Supabase → PDF to HR | Live |

## Notes

- The old "Room Rounds" QR code pointed at the root URL; it now lands on the hub,
  where Rounds is one tap away behind the Leadership PIN.
- PWA: `manifest.webmanifest` + `icon-192.png` / `icon-512.png`. Add to Home Screen
  on shared phones installs the hub as an app.
- When retiring an app, remove its hub tile and mark it here — then take down its
  posted QR codes.
