# Maintainer handover

## Delivery

- Repository: fullmetalsonic/webcarrot-offline-demo (public).
- Pages source: main branch, repository root.
- `index.html` and the Release asset `webcarrot-offline-demo.html` must be byte-identical.
- Current published version: 1.0.13. Settings/menu source: official ajouatom/openpilot:carrot-wip commit 05c1678033c1c778f0386fba00c1e105bb26c427 (197 parameters; 333 vehicle document names; PaddleMode max=3).
- Source schema and vehicle catalog are embedded; no runtime device connection.
- Published v1.0.0 on 2026-09-24. Pages built successfully and unauthenticated latest-Release API returned HTTP 200 with CORS allowed.
- Published v1.0.1 on 2026-09-24. Pages built successfully; the latest stable Release API returned HTTP 200 with CORS allowed and `v1.0.1`.
- Local HTML, served Pages HTML and downloaded v1.0.1 Release HTML share SHA-256 `e8203a19054b54f14cc59f0c05fe0ccf0212f25239a5e14a7c71653cf3f67429`.
- Published v1.0.2 on 2026-09-25 with hierarchical browser Back behavior.
- Published v1.0.3 on 2026-09-26 with the official `carrot` settings/menu schema. Pages, repository `index.html`, workspace copy, and Release asset SHA-256: `A4E3022947423C1DD7A762F034E6961F5118598203CF11E7352B65F842B31E73`.
- Published v1.0.4 on 2026-09-26 from official carrot-wip d4fca67f20bc18ea543d93f9db5a7ac4fef66f91 (184 parameters); Pages/repository/Release HTML SHA-256: 951CC689EEF295141518A30487A8637AE664D7C1EA4B1F1011D3F59EF0D2A016.
- JavaScript syntax and focused production/browser numeric-control checks passed for v1.0.13. Full runtime update scenarios, original-screen screenshot parity and physical-phone validation remain unrun.
- v1.0.1 corrects display of imported `True`/`False` string values for schema-defined binary parameters. Unedited JSON values and unknown keys remain intact. The current user backup had 12 such values (5 true, 7 false); four keys are in the current menu and eight are unknown to its schema.
- v1.0.2 records hierarchical in-app view state in browser history: Android/browser Back returns through settings, search, vehicle and value-dialog steps. The Settings top level does not trap Back. Syntax checked; real phone/browser interaction remains unverified.

## Future releases

1. Review the official ajouatom/openpilot:carrot-wip settings, menu, descriptions and relevant web renderer changes.
2. Update the embedded data and code together. Preserve unknown imported keys, absent settings, JSON types and nested values. Do not migrate a user's backup based on parameter count.
3. Increment the single application-version constant using stable SemVer. Keep the upstream source SHA separate from the demo version.
4. Review only the intended distributable files for credentials, personal backups and private paths. Include upstream license notices.
5. Publish the exact same HTML as Pages `index.html` and the tagged Release asset `webcarrot-offline-demo.html`. Publish Pages before marking the stable Release latest.
6. Check the public Pages response, Release metadata and asset hash. Record runtime/visual tests separately from syntax or delivery checks.

## Known validation limit

No local URL/browser workaround is allowed by the user's instructions. The current delivery has not passed rendered screenshot parity or phone interaction validation. Do not label these as passed based on source inspection.

For v1.0.13, the permitted public Pages URL was exercised in a real browser at desktop width and with a verified 390px viewport: six increments, direct integer entry, bounds, narrow-range controls and imported-to-downloaded JSON preservation passed. This is representative browser-flow evidence, not a physical-phone or full original-screen visual comparison. Browser viewport emulation resets between tool rounds and must be reapplied; a screenshot request timed out, so no screenshot parity was claimed.

Brand visibility follows the official server's Hyundai CarName fallback. The demo does not decode binary CarParamsPersistent.brand, and CarSelected3 alone does not override the brand filter. Toyota/Lexus restrictions are embedded but require the unavailable binary brand path; the demo does not invent a Toyota CarName fallback. This offline limitation is documented in both README languages.

## Publication contents

Only the demo, public documentation and source license notices belong here. Never include real parameter backups, device captures, automation logs or private workspace files.

## Historical v1.0.3 carrot source selection (2026-09-26; superseded)

- v1.0.3 used `ajouatom/openpilot:carrot`; this source selection is superseded by the carrot-wip correction below. The personal `fullmetalsonic` WIP paddle patch is private user functionality and is excluded from the demo menu.
- Embedded settings and complete menu are copied from upstream commit `62d004320d5a8683b919379f16811a832a894cf5`: 185 parameters. `PaddleMode` retains the official range 0 through 3 and its official descriptions/options.
- Added menu parameters: `CanfdStopRetry`, `ClusterHudLiveFps`, `ClusterHudCoreMode`, `ClusterHudPriority`. Removed menu parameters: `CruiseCoastingPercent`, `RadarTrackFlip`, `StoppingAccel`. Upstream hierarchy, ordering, labels, descriptions and controls are preserved as a complete schema.
- Removed schema keys remain intact when present in an imported backup. No backup normalization or count-based migration was added.
- Published as v1.0.3. Focused source/schema equality, JavaScript syntax, `git diff --check`, Pages build, latest Release metadata, and downloaded asset hash passed.
- Rendered screenshot parity and physical phone interaction remain unrun.

## Published v1.0.4 official carrot-wip correction (2026-09-26)

- The intended demo source is official `ajouatom/openpilot:carrot-wip`. Do not use personal `fullmetalsonic` fork changes.
- Embedded schema/menu is copied as a complete object from `d4fca67f20bc18ea543d93f9db5a7ac4fef66f91`, including parameter additions/deletions, descriptions, ranges/defaults/options and menu hierarchy/order.
- JSON import/export and value normalization are unchanged. Unknown keys and unedited backup values are preserved even if menu definitions differ.
- Published as v1.0.4. Pages, repository and Release HTML SHA-256 was 951CC689EEF295141518A30487A8637AE664D7C1EA4B1F1011D3F59EF0D2A016.
- Focused schema/menu equality, JavaScript syntax, diff whitespace checks, Pages build and public asset parity passed; visual/device validation is unrun.

## Published v1.0.5 official carrot-wip settings update (2026-09-28)

- Source is official ajouatom/openpilot:carrot-wip commit 70b1f568cb33ef3c5fa5ada235a177ba39807b65.
- Menu tree and parameter count remain unchanged at 184. VEgoStopping minimum changes from 1 to 10 and its Korean/English/Chinese descriptions now state the enforced minimum and saved-value adjustment. MyDrivingModeAuto descriptions change in Korean/English/Chinese.
- JSON import/export logic is unchanged. Unknown keys and unedited imported values remain preserved.
- Pages, repository index.html, workspace mirror and Release HTML SHA-256: EFCA8151D5C062E8DDACFCE5F4A787DCFE2EDFCE7958E840E360A12AE81F326F. Focused source/schema equality, JavaScript syntax, git diff --check, Pages build, latest Release API/CORS and artifact parity passed. Visual/phone validation remains unrun.

## Published v1.0.6 official driver monitoring settings update (2026-09-28)

- Source is official ajouatom/openpilot:carrot-wip commit 123db00c1dfc210caa7939912f9bc342a3f5c146. The branch also changed during preparation from aecc1cc to 123db00; the latter updated DriverMonitoringMode descriptions in Korean, English and Chinese and was included before publication.
- The official menu replaces DisableDM with DriverMonitoringMode and CarrotVisionEnabled, giving 185 parameters. The demo uses the complete source schema, menu, descriptions, choices, limits and defaults. Experimental mode 1 requires the official Korean confirmation wording.
- Imported DisableDM and other unsupported keys, and unedited values, remain in exported backup JSON. Demo code commit: e319d4f8000e01b574af956d2898fee837327844.
- Pages build succeeded. Local index.html, served Pages HTML and downloaded v1.0.6 Release asset webcarrot-offline-demo.html share SHA-256 A6513AB0AC59F9522C50C1D018006A0832F93964C7B20BCCA6B629FE6E7E1172. Latest stable Release API returned v1.0.6 with CORS allowed.
- Exact source/schema/menu equality, JavaScript syntax, git diff --check and focused confirmation/backup preservation checks passed. Rendered visual and physical phone validation remain unrun.

## Published v1.0.7 Korean search input fix (2026-09-29)

- User screenshot from Samsung Browser showed decomposed Hangul while typing in settings search. Each input event previously called render(), replacing the focused search element and interrupting IME composition.
- Search now keeps the input element in place and refreshes only the result container, count and page title. The embedded 185-parameter schema and backup import/export behavior are unchanged. Demo code commit: edfc8bf340a28ea86b8d5bf1e5d803d046c05059.
- JavaScript syntax, git diff --check, unchanged schema and focused DOM structure inspection passed. General ADB listed no device; RoamADB did not respond during this run, so physical Samsung Browser composition remains unverified.
- Pages build succeeded. Local index.html, served Pages HTML and downloaded v1.0.7 Release asset webcarrot-offline-demo.html share SHA-256 C4147CF123C1AE32756E609BCF82EAA05EFBAC5ADF1B1FFCC0F56EA0BC0599EB. Latest stable Release API returned v1.0.7 with CORS allowed.

## Published v1.0.8 official settings and renderer update (2026-10-05)

- Source: official ajouatom/openpilot:carrot-wip 7432ac9b5c0cac7b92fdf8393c5dda4d2de9a99b. Complete embedded schema/menu matches upstream, with 187 parameters. Added DriverMonitoringEnabled (search only) and HyundaiCanfdClusterDirectTx (CANFD·HDA). Updated DriverMonitoringMode, CarrotVisionEnabled, UseLaneLineSpeed, EnableRadarTracks and SoundVolumeAdjust descriptions.
- Matched search-only filtering, named choices, default metadata, narrow-pane control placement, hidden_brands through CarName, and detail_parent navigation for the five ONNX child settings under ShareData. Browser Back includes the detail stage. Official PaddleMode max=3 and VEgoStopping min=10 remain; no personal fork patches were included.
- Focused VM checks passed: exact full schema/menu equality, normal/search/detail visibility and counts, all parameter description rendering, option labels, unknown/nested values and unedited True/False backup preservation. JavaScript syntax and git diff --check passed. The mounted Korean search input and backup functions were preserved.
- Code commit: e90e990c54b8e43b2aed9517f9fb096e250951a3. Pages and downloaded Release asset match local HTML: SHA-256 9F90DE5231115A131AF87733B3D0AB52CF8EDE13B5EC1B6AE6E353D8D1AB0E2C (261335 bytes). Latest stable Release API/CORS passed at publication. Rendered visual and physical phone checks remain unrun.

## Published v1.0.9 latest official descriptions (2026-10-05)

- Official HEAD advanced during publication to e6a6284437a76c2d60bda75efa4cb2cf6e85ef07. LeadAccelResponse and LeadAccelResponseTF1 through TF4 changed their Korean/English/Chinese descriptions (15 fields). Extra headroom is held to 1.2 times TF distance, gradually released between 1.2 and 1.5 times, and recovered at or above 1.5 times regardless of lead speed. Count, hierarchy/order, ranges/defaults, input controls and visibility are unchanged from v1.0.8.
- Exact complete source/schema equality, only the intended 15 description-field changes, JavaScript syntax and git diff --check passed. UI and import/export code are unchanged from v1.0.8; its focused checks were reused rather than repeated. No physical phone or rendered screenshot parity check was performed.
- Code commit: 3802787f5605d9999dc9cbf1934f5be421b50814. Pages build succeeded. Local HTML, public Pages HTTP 200 response and downloaded Release asset webcarrot-offline-demo.html share SHA-256 C812FC56E629B47BE7D8AB6353589C3AA4AEF6A573582BAF94C252B48B63B0C1 (266275 bytes). Public latest Release API returned v1.0.9, draft=false, prerelease=false, with CORS allowed.
- Source verification used current official files. OpenPilot code, fork branches and other automations were untouched.

## Published v1.0.10 weekly official settings, search and catalog sync (2026-10-12)

- Official current remote HEAD was rechecked at 3f537bc13fdc325f4ef3852f8ab5a762566cefc1. The complete schema/menu matches the pinned source with 184 parameters. CarrotYouTubeLive, CarrotYouTubeQuality and CarrotYouTubeTimestamp were removed from the menu; imported copies of these keys remain in exported backups.
- Twelve existing definitions changed across 43 fields: LongTuningKpV/Kf/KiV, AlwaysLateral, SpeedFromPCM, ShareData, OnnxLaneThreshold, OnnxBsdThreshold, OnnxBsdSmoothingMs, StoppingAccel, ShowModelView and ClusterHud. Updated descriptions, Hyundai/Toyota hidden_brands, ONNX minimum/step/default metadata, and the C4 layout title/options/select control. The offline binary-brand limitation above remains.
- Compared setting.js, derived_model.js, search entries.js/match.js, setting styles, params.py/settings.py and car.js/cars.py. Included the official NFC-normalized initial-consonant, multiple-keyword AND and whitespace-free matcher while keeping the focused search input mounted. Select labels wrap and avoid duplicated value prefixes.
- The supported vehicle definition files and server catalog source are unchanged from the prior baseline. A direct reconstruction found four previously omitted Tesla Model 3/Y HW3/HW4 entries. Restored these exact official names; all 333 names, manufacturer groups and sorting match the official catalog. Model X remains listed with the existing forced-selection exclusion notice, consistent with selected_car.py; Model 3/Y are forced-selectable.
- Focused validation PASS: full schema/menu equality, JavaScript syntax, git diff --check, C4 selection/editing, ONNX min=0/step=1/BSD default=94 editing, search-only/detail/Hyundai fallback visibility, NFC/NFD/initial-consonant/AND/whitespace-free search and input object persistence. ImportBackup through exportBackup Blob JSON preserves removed keys, unsupported/nested values and types; explicit editing changes only the edited key. All five Tesla selections through commitCar and export preserve the exact CarSelected3 and unknown values. No product verification failures occurred. Rendered browser/visual parity and physical phone interaction were not executed.
- Code commit: e6ee54fa873f09918344a49df2a024b70a5e267f. Pages built successfully and returned HTTP 200. Local index.html, served Pages HTML and downloaded v1.0.10 Release asset webcarrot-offline-demo.html share SHA-256 F2C3E4CFE0DE2694669AC634C0BF03DC6A72D3C6540E4283AFD2B69A917DC06C (275431 bytes). Latest stable Release API returned v1.0.10 with draft=false, prerelease=false and CORS allowed.
- Only this demo and its public documentation were changed. OpenPilot source, fork branches, vehicle code and unrelated automations were untouched.

## Published v1.0.11 weekly official parameter/menu sync (2026-10-19)

- Official remote HEAD was rechecked at 2cd1d7978d9979bd5ace8d730870cc29dbe608b3. The complete schema/menu matches the pinned source with 196 parameters, up from 184; no parameters were removed in this revision.
- Added NNFF, BlinkerLatchedTurn, LaneChangeLeverWait, LeadBrakeLights, SignalAssistMode, VehicleNaviDecelCancel, VehicleNaviDecelCancelBox, VehicleNaviDecelCancelMobileZone, VehicleNaviDecelCancelBump, VehicleNaviDecelCancelUnknown, VehicleNaviDecelCancelEarlyWarning and VehicleNaviSectionAvgControl. NNFF remains search-only; the five VehicleNaviDecelCancel child settings open through the official detail_parent relationship.
- Nine existing definitions changed across 26 description fields: EnableRadarTracks, LeadAccelResponse, LeadAccelResponseTF1 through TF4, AutoNaviSpeedCtrlMode, ClusterHud and ClusterHudEncoder. All menu grouping/order, labels, controls, ranges/defaults/options, warnings and visibility metadata are included in the complete schema comparison.
- Official setting renderer, search, visibility, vehicle API and selected_car sources are unchanged. Hyundai values.py changed outside the vehicle CAR definitions; the CAR AST and the other six supported brands are unchanged. The 333-name vehicle catalog still matches the official names, manufacturer groups and order. Only DEMO_VERSION, SOURCE_SHA and SCHEMA changed in index.html; application runtime code and the catalog are byte-identical to v1.0.10.
- Focused validation PASS: exact 196-parameter schema/menu equality, JavaScript syntax, git diff --check, new controls at min/max with out-of-range rejection, NNFF search-only visibility, navigation-cancel detail entry/search/editing, and previous-menu restoration through production restoreNav(). Actual importBackup to exportBackup Blob JSON preserves unedited values, unsupported/previously removed keys, nested structures and types while exporting explicit edits. The focused search input object remains mounted. Prior unchanged-runtime evidence was reused; rendered browser Back, visual parity and physical phone interaction were not executed. No product verification failure occurred; a test-fixture CarName/count preparation mistake was corrected without changing product requirements.
- Code commit: 950f8c6327212c2a47b6a8e7526a0f792b5d3592. Pages built successfully and returned HTTP 200. Local index.html, served Pages HTML and downloaded v1.0.11 Release asset webcarrot-offline-demo.html share SHA-256 DC2F380E0FD9570098A6EC458A7EB24AC7E99B3330E87A2628B37C0AD2C02E04 (316529 bytes). Latest stable Release API returned v1.0.11 with draft=false, prerelease=false and CORS allowed. The changed-file credential/private-path scan passed.
- Only this demo and its public documentation were changed. OpenPilot source, fork branches, vehicle code, the separate FMS demo and unrelated automations were untouched. The documented binary CarParamsPersistent brand-decoding limitation remains.

## Published v1.0.12 weekly official ONNX BSD setting sync (2026-10-26)

- Official remote HEAD was rechecked immediately before publication at 05c1678033c1c778f0386fba00c1e105bb26c427. The complete schema/menu matches the pinned source with 197 parameters. Added OnnxBsdEnabled, a 0/1 toggle with default 0, detail_parent=ShareData and detail_section=bsd; no keys were removed.
- ShareData, SignalAssistMode, ClusterHud and ClusterHudEncoder changed their descr/edescr/cdescr fields (12 description fields). The official menu inserts OnnxBsdEnabled immediately after ShareData. ONNX detail children increase from five to six and remain excluded from ordinary rows/counts.
- The existing generic detail renderer shows the new toggle after ShareData, followed by the existing lane and BSD controls in source order. Its bsd metadata does not imply a separately rendered BSD card. Upstream live ONNX extension status-panel changes are device-server functionality already outside the offline scope; no new live panel was implemented.
- Only DEMO_VERSION, SOURCE_SHA and the exact source SCHEMA changed in index.html. Runtime code, search/visibility logic and the embedded 333-name vehicle catalog are unchanged; official vehicle API/definitions/selected_car blobs are unchanged and the prior catalog evidence was reused. Applied Ponytail full/local integration and the AGY small mechanical-change exception: exact data/constant/documentation replacement required no generated implementation proposal.
- Focused validation PASS: full schema/menu equality, JavaScript syntax, git diff --check, ordinary-row exclusion, ShareData detail entry and actual HTML order, search, production toggle OFF/ON, default restoration to 0 and exportBackup Blob JSON. Imported unedited values, unsupported/previously removed keys and original/nested types remain intact. Unchanged-runtime/IME and vehicle evidence was reused. Search-fixture expectations and temporary-file line-ending preparation errors were corrected without weakening product requirements; there was no product verification failure. Rendered browser/visual parity and physical phone interaction were not executed.
- Code commit: e6575c17ba0df4e3ea09742e6efe254af6ab729a. Pages built successfully and returned HTTP 200. Local index.html, served Pages HTML and downloaded v1.0.12 Release asset webcarrot-offline-demo.html share SHA-256 03FD85C20462A9A63D12CE1D7FFD640633D2436CC7901F105E426A00BFA0D8E9 (316213 bytes). Latest stable Release API returned v1.0.12 with draft=false, prerelease=false and CORS allowed. The changed-file credential/private-path scan passed.
- OpenPilot source, fork branches, vehicle code, the separate FMS demo and unrelated automations were untouched. The documented binary CarParamsPersistent brand-decoding limitation remains.

## Published v1.0.13 official numeric step behavior correction (2026-10-27)

- The user reported skipped step factors and displayed factors producing incorrect changes. The public v1.0.12 reproduced StopDistanceCarrot x1 changing 600 to 610 and cycling only 1/10/100. Official renderer/control/config arithmetic is identical at schema baseline 05c1678033c1c778f0386fba00c1e105bb26c427 and reviewed revision 604bc0a22733e648ec05b268da1ffaae7db52a69: the cycle is 1/2/5/10/50/100 and the selected value itself is the delta, without multiplying p.unit.
- Fixed all 99 numeric steppers through shared selectedStep/control-kind logic. Restored the five missing narrow-range multiplier buttons (CruiseEcoControl, CruiseCoastingPercent, CruiseButtonTest1, CruiseButtonTest3 and AutoNaviSpeedCtrlEnd). Both number and range inputs use step=1 for direct integer entry, independently of the row's selected increment. Integer/range rejection and min/max clamping remain intact. This corrects the 60 unit>1 definitions without changing their source unit metadata.
- Added tests/step-controls.test.cjs with a pinned official control/arithmetic oracle and the actual production click handlers. Run: node --test --test-reporter=tap tests/step-controls.test.cjs. Before the fix: four failures and one pass. After the fix: five groups pass, covering all 99 numeric settings, six factors, both directions and boundary cases; multiplier visibility/cycling; direct non-unit-multiple integers and invalid-value rejection; imported/unsupported/removed/nested/type preservation through Blob export; and unchanged IME, choices and toggles. JavaScript syntax and git diff --check passed. There was no failed product repair attempt after applying the fix.
- Public-browser verification passed on code commit 17fd4c0d296128b5406a1241883c2ec57f25d7f0: StopDistanceCarrot 600→601→603→608→618→668→768 for steps 1/2/5/10/50/100, then the cycle returns to x1. Direct entry 999 is accepted; maximum clamps to 1000, minimum clamps to 400, and x1 advances 400 to 401. At verified width 390px, CruiseEcoControl x5 changes 6→1→6 and all numeric/multiplier buttons fit inside the viewport. An actual downloaded JSON from a synthetic six-key import changed only StopDistanceCarrot and CruiseEcoControl; the unedited out-of-range VEgoStopping value, boolean type, removed key and nested unsupported data remained exact. Screenshot capture timed out as a tool limitation, and physical-phone validation was not performed.
- The source schema (197 parameters), vehicle catalog (333 names), SOURCE_SHA, import/export, validation, search/IME and navigation functions are unchanged. The README was updated in Korean and English. No OpenPilot, FMS, vehicle or automation changes were included. Prior current-source checks were reused rather than performing an unrelated weekly schema update.
- Pages built successfully and returned HTTP 200. Local index.html, public Pages HTML and downloaded v1.0.13 Release asset webcarrot-offline-demo.html share SHA-256 F13CF97590A75A7A8D6B3B132F356FCD0935A1A302CAC6AF9E91559A9F0926BF (316313 bytes). Latest stable Release API returned v1.0.13 with draft=false, prerelease=false and CORS allowed. The changed-file credential/private-path scan passed.
