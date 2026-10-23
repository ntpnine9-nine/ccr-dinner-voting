# CCR Forest Noir V2 — production release authorization and verification

Owner authorization: 23 October 2026. Owner explicitly requested implementation on the actual website and confirmed the start at 17:00 Asia/Bangkok, 18 December 2026.

Baseline / rollback commit: b829bd9a6a2c15b75247f7466bdaf664f84393a2.
Browser-tested source candidate: 2613cddc654b466ce030ebd828241e55e48cef2a.

## Included

Six-page Forest Noir redesign; real venue assets; responsive mobile navigation; native gallery lightbox; rich food cards; truthful Home Event Pass; unchanged serving and budget models; standalone admin summary; complete result bundle exports; participant search/filters; RSVP in-flight edit lock; second-by-second countdown and timed calendar.

## Completed checks

- npm test and npm run check pass, including the new event time, report and summary tests and all prior regression suites.
- Browser-rendered actual source, not a mockup: all seven routes reviewed at 320, 360, 390, 430, 768, 1024, 1280, 1440 and 1920px. No document horizontal overflow after styles and scripts loaded (63 route/width cases).
- Admin Preview dashboard additionally measured at the same nine widths: no document horizontal overflow. Preview is explicitly labelled and does not load real private participant data.
- Home counter observed updating; target is 17:00 ICT / 10:00 UTC. Home ticket displays empty/draft responses instead of an empty box.
- Mobile menu opens with Enter and closes with Escape. Responsive iframe pointer tooling was inconsistent, so this is not claimed as a physical touch-device test.
- Actual Vote form: one menu x2 disables other menus in the category; changing it to x1 permits a second x1; remaining options then disable. H shows one selected unit billed twice. Only browser drafts were changed; no real ballot was submitted.
- Generated ZIP CRC and CSV UTF-8/column integrity checked during implementation.

## Boundaries

No database schema, Auth settings, passwords, campaign status, invitation rights, real ballots or preferences are modified by this release. The vote Edge Function remains unchanged. The ccr-app function only expands the existing static asset allowlist, preserving its existing public configuration and methods.

Private admin login and real private exports have not been retested with the owner's current credentials. Server authorization is preserved and summary session/denial/failure cases are exercised with mocked dependencies. No production submission or deletion smoke was run. CWV, full WCAG conformance, real-device testing and owner acceptance are not claimed.

## Deployment

Publish the reviewed source to main using an expected-head check; allow the existing GitHub Pages pipeline to serve it. Deploy only ccr-app's updated static allowlist. Verify page/asset bytes, countdown behavior and authentication boundary after release. If an integration issue appears, restore baseline frontend files and baseline ccr-app; no database rollback is required.

The external responsive evidence file records the exact source candidate and dimensions. Subsequent release commit changes only this verification document, not the browser-tested frontend.
