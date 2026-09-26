# Maintainer handover

## Delivery

- Repository: fullmetalsonic/webcarrot-offline-demo (public).
- Pages source: main branch, repository root.
- `index.html` and the Release asset `webcarrot-offline-demo.html` must be byte-identical.
- Current published app version: 1.0.2. Local source schema now targets official ajouatom/openpilot:carrot at 62d004320d5a8683b919379f16811a832a894cf5; this local source sync has not been released.
- Source schema and vehicle catalog are embedded; no runtime device connection.
- Published v1.0.0 on 2026-09-24. Pages built successfully and unauthenticated latest-Release API returned HTTP 200 with CORS allowed.
- Published v1.0.1 on 2026-09-24. Pages built successfully; the latest stable Release API returned HTTP 200 with CORS allowed and `v1.0.1`.
- Local HTML, served Pages HTML and downloaded v1.0.1 Release HTML share SHA-256 `e8203a19054b54f14cc59f0c05fe0ccf0212f25239a5e14a7c71653cf3f67429`.
- JavaScript syntax check passed. Runtime update scenarios and rendered UI/phone validation remain unrun.
- v1.0.1 corrects display of imported `True`/`False` string values for schema-defined binary parameters. Unedited JSON values and unknown keys remain intact. The current user backup had 12 such values (5 true, 7 false); four keys are in the current menu and eight are unknown to its schema.
- v1.0.2 records hierarchical in-app view state in browser history: Android/browser Back returns through settings, search, vehicle and value-dialog steps. The Settings top level does not trap Back. Syntax checked; real phone/browser interaction remains unverified.

## Future releases

1. Review the official ajouatom/openpilot:carrot settings, menu, descriptions and relevant web renderer changes.
2. Update the embedded data and code together. Preserve unknown imported keys, absent settings, JSON types and nested values. Do not migrate a user's backup based on parameter count.
3. Increment the single application-version constant using stable SemVer. Keep the upstream source SHA separate from the demo version.
4. Review only the intended distributable files for credentials, personal backups and private paths. Include upstream license notices.
5. Publish the exact same HTML as Pages `index.html` and the tagged Release asset `webcarrot-offline-demo.html`. Publish Pages before marking the stable Release latest.
6. Check the public Pages response, Release metadata and asset hash. Record runtime/visual tests separately from syntax or delivery checks.

## Known validation limit

No local URL/browser workaround is allowed by the user's instructions. The current delivery has not passed rendered screenshot parity or phone interaction validation. Do not label these as passed based on source inspection.

## Publication contents

Only the demo, public documentation and source license notices belong here. Never include real parameter backups, device captures, automation logs or private workspace files.

## Official carrot source correction (2026-09-26)

- The user clarified that the public demo follows official `ajouatom/openpilot:carrot`. The personal `fullmetalsonic` WIP paddle patch is private user functionality and is excluded from the demo menu.
- Embedded settings and complete menu are copied from upstream commit `62d004320d5a8683b919379f16811a832a894cf5`: 185 parameters. `PaddleMode` retains the official range 0 through 3 and its official descriptions/options.
- Added menu parameters: `CanfdStopRetry`, `ClusterHudLiveFps`, `ClusterHudCoreMode`, `ClusterHudPriority`. Removed menu parameters: `CruiseCoastingPercent`, `RadarTrackFlip`, `StoppingAccel`. Upstream hierarchy, ordering, labels, descriptions and controls are preserved as a complete schema.
- Removed schema keys remain intact when present in an imported backup. No backup normalization or count-based migration was added.
- This is a local unreleased change; version remains 1.0.2 until the maintainer prepares a release. README source/count describes this checkout. Existing Pages and Release artifacts require a separate authorized publication step.
- Focused source/schema equality, JavaScript syntax and whitespace checks are recorded by the integrating agent. Rendered and physical phone validation remain unrun.
