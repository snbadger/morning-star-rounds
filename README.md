# Morning Star Staff Apps

Staff apps hub for Morning Star Post Acute. The site root is the landing page
(installable as a home-screen PWA); each app lives at a subpath.

**Hub:** https://snbadger.github.io/morning-star-rounds/

## App Registry

| App | URL | Audience | Data | Status |
|-----|-----|----------|------|--------|
| Staff Apps Hub | `/` (this repo root) | Everyone | — (static links) | Live |
| Shower Sheet | `/showers/` | CNAs | Supabase `shower_logs` | Live |
| Room Changes | `/room-changes/` | All staff | Supabase `room_changes` | Live |
| Ideas for Improvement | `/ideas/` | All staff | Supabase → Asana | Live |
| Skill Validation | `/competency/` | Leadership (PIN on hub, moved 8/19/26) | Supabase `competency_validations` | Live |
| Equipment Repair | `/repairs/` | All staff | Supabase `equipment_repairs` + repair-notify email | Live |
| Shout Outs | `/shoutouts/` | All staff | Supabase `shoutouts` | Live |
| Room Rounds & Daily Board | `/rounds/` | Leadership (PIN on hub) | Supabase `rounding_observations`, `action_items` | Live — moved from root 8/19/26 |
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
