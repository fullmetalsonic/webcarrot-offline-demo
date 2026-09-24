# Maintainer handover

## Delivery

- Repository: fullmetalsonic/webcarrot-offline-demo (public).
- Pages source: main branch, repository root.
- `index.html` and the Release asset `webcarrot-offline-demo.html` must be byte-identical.
- Current app version: 1.0.1. WIP source: 43203371004e035bdb70a00a8dad29a4b657c6c3.
- Source schema and vehicle catalog are embedded; no runtime device connection.
- Published v1.0.0 on 2026-09-24. Pages built successfully and unauthenticated latest-Release API returned HTTP 200 with CORS allowed.
- Published v1.0.1 on 2026-09-24. Pages built successfully; the latest stable Release API returned HTTP 200 with CORS allowed and `v1.0.1`.
- Local HTML, served Pages HTML and downloaded v1.0.1 Release HTML share SHA-256 `e8203a19054b54f14cc59f0c05fe0ccf0212f25239a5e14a7c71653cf3f67429`.
- JavaScript syntax check passed. Runtime update scenarios and rendered UI/phone validation remain unrun.
- v1.0.1 corrects display of imported `True`/`False` string values for schema-defined binary parameters. Unedited JSON values and unknown keys remain intact. The current user backup had 12 such values (5 true, 7 false); four keys are in the current menu and eight are unknown to its schema.

## Future releases

1. Review the intended upstream WIP settings, menu, descriptions and relevant web renderer changes.
2. Update the embedded data and code together. Preserve unknown imported keys, absent settings, JSON types and nested values. Do not migrate a user's backup based on parameter count.
3. Increment the single application-version constant using stable SemVer. Keep the upstream source SHA separate from the demo version.
4. Review only the intended distributable files for credentials, personal backups and private paths. Include upstream license notices.
5. Publish the exact same HTML as Pages `index.html` and the tagged Release asset `webcarrot-offline-demo.html`. Publish Pages before marking the stable Release latest.
6. Check the public Pages response, Release metadata and asset hash. Record runtime/visual tests separately from syntax or delivery checks.

## Known validation limit

No local URL/browser workaround is allowed by the user's instructions. The current delivery has not passed rendered screenshot parity or phone interaction validation. Do not label these as passed based on source inspection.

## Publication contents

Only the demo, public documentation and source license notices belong here. Never include real parameter backups, device captures, automation logs or private workspace files.
