# WebCarrot 오프라인 설정 데모 v1.0.19 | WebCarrot Offline Settings Demo v1.0.19

[데모 바로 실행 · Open the demo](https://fullmetalsonic.github.io/webcarrot-offline-demo/) · [최신 HTML 다운로드 · Download the latest HTML](https://github.com/fullmetalsonic/webcarrot-offline-demo/releases/latest/download/webcarrot-offline-demo.html) · [변경 기록 · Releases](https://github.com/fullmetalsonic/webcarrot-offline-demo/releases)

**한국어** | [English](#english)

WebCarrot 설정 메뉴를 오프라인에서 살펴보고, 차량·파라미터 값을 편집해 백업 JSON으로 주고받는 비공식 데모입니다. 원본 제작자의 공식 웹캐럿이 아니며, 기기와 통신하거나 차량 설정을 직접 적용하지 않습니다.

## 빠른 시작

1. 위의 **데모 바로 실행**을 누릅니다. 오프라인에서 사용하려면 **최신 HTML 다운로드**로 단일 HTML 파일을 저장해 엽니다.
2. **도구 → JSON 백업 불러오기**에서 기존 콤마 파라미터 백업을 선택합니다. 백업이 없으면 데모가 제공하는 원본 기본값으로 시작할 수 있습니다.
3. **설정**에서 분류와 그룹을 따라가거나 검색해 파라미터를 찾습니다. ±를 길게 누르면 반복 조절되고, 가운데 값을 누르면 직접 입력할 수 있습니다. **기본값**은 확인 후 해당 항목만 바꿉니다.
4. **도구 → 백업 JSON 내보내기**를 누릅니다. 콤마의 파일 복원에서 지원하는 키와 값만 적용됩니다. 기기에 적용할 때는 그 기기의 백업을 먼저 가져와 필요한 항목만 편집하고, 복원 후 변경값을 확인하세요.

휴대폰 브라우저의 뒤로가기는 차량 선택·값 선택창을 닫고, 설정 하위 그룹을 한 단계씩 거슬러 올라갑니다. 설정 첫 화면에서는 브라우저 기본 뒤로가기가 동작합니다.

## 차량 선택과 백업 보존

- 데모에서 **차량 선택**을 누르면 제조사 → 모델 → 확인 순서로 `CarSelected3` 값을 편집합니다. 기기에 즉시 적용되지는 않습니다. 실제 적용은 JSON 백업을 콤마에서 복원한 뒤 재시작해야 합니다.
- 기존 백업을 불러오면 설정 수 차이를 이유로 파라미터를 자동 추가하거나 지우지 않습니다. 모르는 키, 수정하지 않은 값의 자료형과 중첩값은 내보낼 때 유지됩니다. 명시적으로 변경한 값만 저장되며, 선택한 차량은 `CarSelected3`에 기록됩니다.
- 이진 설정은 원본에 등록된 BOOL/INT 자료형으로 해석합니다. BOOL의 `"True"`, `"yes"`, `"on"` 등은 원본 복원 규칙에 따라 표시하고, INT에서 복원할 수 없는 문자열 등은 확인이 필요한 원본 값으로 표시합니다. 편집 전 원래 값은 내보내기에서 유지됩니다.
- 일반 정수 설정과 갭 단계 정보도 원본 복원 규칙으로 표시·증감 시작값을 계산합니다. 예를 들어 정수 설정에 `"2.5"`가 있으면 복원값 2에서 +1을 계산하며, 편집 전에는 원래 `"2.5"`를 보존합니다. 직접 입력은 원본 웹캐럿의 입력 보정 규칙을 따릅니다.
- 불러온 파일 이름과 임시 보관 상태를 화면에서 확인할 수 있습니다. 같은 탭을 새로고침하면 임시 보관한 작업을 복원합니다. 탭을 닫거나 다른 브라우저로 옮길 때는 JSON 파일로 내보내세요. 저장소가 차단되거나 가득 차면 경고하며, 손상된 보관본을 읽었을 때는 새 백업을 불러오거나 **새 데모 시작**을 선택하기 전까지 내보내기를 막습니다.
- 파일을 읽는 동안 편집·내보내기·새 데모 시작을 막습니다. 다른 파일을 연속 선택하면 마지막 선택만 적용합니다. 새 파일이 적용되면 이전 편집창과 조작은 종료됩니다. 메뉴 밖 키나 중첩된 형식은 임의로 풀거나 지우지 않고 안내와 함께 보존합니다.
- 화면의 유효값과 백업 원본이 다르면 구분해 표시합니다. 사용자가 값을 명시적으로 적용하면 해당 원본 키에 저장하고, 보기·취소만 했을 때는 누락된 키도 추가하지 않습니다. 내보내기 파일명에는 공식 데모 구분, 원본 파일 이름과 시각이 들어갑니다.
- 내장 차량 목록은 원본의 차량 정의를 바탕으로 합니다. 기기별 추가 차량은 목록에 없을 수 있습니다. 기존 백업에 있는 그런 값도 그대로 보존됩니다.
- 콤마 서버에서 받는 실제 차종별 인기값은 데모가 알 수 없어 표시하지 않습니다. 오프라인 안내로 구분합니다.
- 차량 선택 목록에서 확인된 현대·기아·제네시스 및 토요타·렉서스에는 공식 브랜드 조건을 적용합니다. 콤마는 실제 차량 식별 결과를 사용하고, 데모는 선택 차량과 백업에서 확인할 수 있는 정보로 설정을 표시합니다. 갭 단계는 백업의 `LongitudinalPersonalityMax`에 따라 최대 3 또는 4로 표시합니다. 숨겨지거나 표시 범위를 벗어난 가져온 값도 편집 전에는 보존합니다.
- ONNX 차선·BSD의 세부값 6개는 원본 `detail_parent` 관계에 따라 **상세 설정**에서 열며, 일반 목록과 설정 개수에는 포함하지 않습니다.

**복원 호환성:** 콤마의 일반 파일 복원은 지원하지 않는 키와 `DriverMonitoringEnabled` 등 제외 항목을 건너뜁니다. `"True"`·`"False"`는 BOOL 키에 쓸 수 있지만 INT 키에서는 실패할 수 있습니다. 데모는 가져온 값을 자동으로 바꾸지 않습니다. 콤마는 일부 값이 실패해도 복원 응답을 반환할 수 있으며, 파일 복원은 설정 화면의 범위 보정과 다릅니다. 새 데모의 기본값 묶음은 실제 기기에서 받은 전체 백업과 다릅니다.

## 업데이트

- **v1.0.19**는 v1.0.16의 업데이트 백업이 예전 탭 보관값이나 새 데모 표식에 가려지는 문제를 수정했습니다. 두 보관본이 충돌하면 **구버전 업데이트 백업 사용** 또는 **이전 탭 보관값 유지**를 선택하며, 선택 전 새로고침해도 후보를 유지합니다. 구버전에서 수정한 뒤 업데이트했다면 첫 번째 백업을 선택하세요. 수정하지 않은 값과 미지원 키의 원문은 그대로 보존합니다.
- **v1.0.18**은 일반 INT의 소수·불리언 입력 증감, `"4.0"`·`"4e0"` 갭 능력값, 대소문자·공백이 있는 언어 표시를 원본에 맞췄습니다. 값 표시 폭이 바뀔 때 한 번의 터치로 입력창까지 열리는 문제도 수정했습니다. 설정 정의와 차량 목록은 그대로입니다.
- **v1.0.17**은 백업 처리 수리입니다. 새로고침 후 기본값이 내보내지는 문제, 읽기 완료 순서 역전, 이전 편집창의 값 덮어쓰기, 업데이트 보관본의 탭 간 덮어쓰기, 표시값과 저장값의 불일치를 수정했습니다. 원본 설정 212개와 차량 목록은 v1.0.16 기준을 유지합니다.
- **v1.0.16**은 공식 carrot-wip [0df8361](https://github.com/ajouatom/openpilot/commit/0df83618f196357165a29218c9a588b0131c7d20) 기준입니다. 수동 턴 자동깜박이와 Tesla CAN 빨간불 정지·수동 차로변경 램프·모델 의도 램프·모델 경로 램프 설정을 추가했습니다. 새 항목은 모두 기본 꺼짐이며, 원본의 전체 설명·주의문과 메뉴 순서를 반영했습니다. 수동 차로변경 표시·항상 조향·Tesla 자동 방향지시등·현대 카메라 SCC 설명도 갱신했습니다.
- **v1.0.15**는 공식 ajouatom/openpilot의 carrot-wip 커밋 [14c5398](https://github.com/ajouatom/openpilot/commit/14c5398fca00d298c2791ecf43f46b3e3fd6cc38)을 기준으로 합니다. `CommaPedalEnabled`를 추가하고 우회전 전 자동 차선변경을 0~500m 거리 설정으로 갱신했습니다. 그 설정에서 `1`은 최신 콤마에서 기존 켜짐 값인 250m로 해석됩니다.
- 배율은 **x1 → x2 → x5 → x10 → x50 → x100** 순서로 바뀌고, 각 설정의 배율은 같은 브라우저에서 유지됩니다. ±를 누른 채 0.9초가 지나면 약 0.16초 간격으로 반복합니다. 직접 입력은 원본처럼 범위를 벗어난 숫자를 경계값으로 맞추고 정수로 반올림합니다. **무게중심 비율**의 0 또는 31~69 규칙도 적용합니다.
- 차량 문서 이름은 333개로 유지됩니다. v1.0.10에서 기존 데모 차량 목록에 누락됐던 Tesla Model 3·Model Y의 HW3/HW4 문서 이름 4개를 복구해 공식 목록 333개와 맞췄습니다. 이번 업스트림에 새로 추가된 차종은 아닙니다.
- v1.0.7의 검색창 유지 방식은 보존해 한글 조합 중 입력창을 다시 만들지 않습니다.
- v1.0.6에서는 운전자 감시 메뉴의 `DisableDM`을 `DriverMonitoringMode`와 `CarrotVisionEnabled`로 교체했습니다. 기존 백업의 `DisableDM` 값은 내보낼 때 보존합니다.
- 인터넷에 연결된 상태로 데모를 실행하면 최신 정식 Release를 백그라운드에서 확인합니다. **도구 → 데모 업데이트**에서 현재/최신 버전과 상태를 확인하거나 수동으로 다시 확인할 수 있습니다. 새 버전이 있을 때 **업데이트하기**가 나타납니다.
- 웹 데모에서는 업데이트 전에 현재 백업을 브라우저에 임시 보관하고 새 버전을 연 뒤 복원합니다. 업데이트 과정의 문제에 대비해 중요한 값은 먼저 JSON 파일로도 내보내 두세요.
- 다운로드한 HTML은 자기 파일을 직접 덮어쓸 수 없습니다. 업데이트 화면에서 **현재 설정 JSON 백업**을 저장하고, 새 HTML을 내려받아 연 뒤 백업을 다시 불러오세요.
- 업데이트 배포에는 전체 HTML이 포함되므로 새 파라미터뿐 아니라 설명과 메뉴 위치도 함께 갱신됩니다. 원본 carrot-wip 변경을 자동으로 모두 가져오지는 않습니다. 유지보수자가 원본 변경을 검토하고 새 데모 Release를 만들어야 업데이트에 나타납니다.
- 네트워크 오류, 요청 제한, 시간 초과 또는 미배포 상태에서도 현재 설정 편집은 계속 가능합니다. 사전 릴리스는 일반 업데이트로 제공하지 않습니다.

## 데모의 범위

현재 임베디드 원본 정의에는 **파라미터 212개**와 **차량 문서 이름 333개**가 포함됩니다. 서버 연결이 필요한 주행·로그·터미널·실제 장치 설정 기능은 제공하지 않습니다. 원본 정의 자체에 설명이 없는 파라미터에는 데모가 설명을 지어내지 않습니다.

원본 carrot-wip가 바뀌어도 이 저장소의 데모가 자동으로 바뀌지는 않습니다. 공식 복원 코드를 시험용 저장소에서 검증했으며, 실제 콤마 복원과 재시작 후 값 확인은 별도입니다.

## 개인정보와 라이선스

파라미터 백업은 GitHub로 보내지 않습니다. 인터넷 연결 시 업데이트 확인을 위해 공개 GitHub Release API만 조회합니다. 데모에는 GitHub 토큰이나 기기 접속 정보가 들어 있지 않습니다.

이 데모는 comma.ai openpilot 및 opendbc의 설정·차량 문서와 WebCarrot UI를 참고합니다. 원본 저작권·MIT 라이선스 고지는 [LICENSE](LICENSE)와 [LICENSE.opendbc](LICENSE.opendbc)에 있습니다. WebCarrot의 공식 배포물은 아니며, 기기 적용 전 사용자가 백업 내용을 직접 확인해야 합니다.

---

<a id="english"></a>

## English

An unofficial offline demo for browsing WebCarrot settings, editing vehicle and parameter values, and sharing them as a JSON backup. It is not the official WebCarrot website. It does not connect to a device or apply settings to a car.

The demo interface is currently in Korean; this README explains it in English as well.

### Get started

1. Select **Open the demo** above. To work offline, download the single HTML file and open it on your device.
2. In the Korean **도구** (Tools) menu, select **JSON 백업 불러오기** (Import parameter backup) to load a Comma parameter backup. You can also start with the demo's included upstream defaults.
3. In **설정** (Settings), browse or search for a parameter. Hold ± to repeat or tap the current value to enter a number. **기본값** (Default) asks for confirmation and changes only that parameter.
4. In **도구** (Tools), select **백업 JSON 내보내기** (Export parameter backup). Comma's file restore applies supported keys and values. For a device, start with its own backup, edit only the intended settings, and check those settings after restore.

On a phone, browser Back closes vehicle and value dialogs first, then walks back through settings groups one level at a time. At the top-level Settings screen, normal browser Back is allowed.

### Vehicle selection and backup preservation

- **차량 선택** (Vehicle selection) edits `CarSelected3` through make → model → confirmation. The demo does not write to a device. To apply the choice, restore the exported JSON on the Comma device and restart it.
- Importing a backup does not add or delete parameters just because the parameter counts differ. Unknown keys and unedited values, including their JSON types and nested structures, are preserved on export. Only explicit edits are saved; the chosen vehicle is recorded as `CarSelected3`.
- Binary values follow the original registered BOOL/INT types. BOOL strings such as `"True"`, `"yes"` and `"on"` follow the official restore rules; invalid INT strings are marked for review. Original values remain intact until an explicit edit.
- General integer settings and gap capability also use the official restored integer as the displayed value and step starting point. For example, a stored `"2.5"` restores to 2, so +1 starts there; the original token is preserved before editing. Direct entry follows the original WebCarrot input normalization rules.
- The screen identifies the loaded file and draft status. A reload in the same tab restores the draft. Export JSON before closing the tab or moving to another browser. Blocked/full storage is reported. A corrupt saved draft blocks export until a valid import or an explicit new demo.
- Editing, export and reset are blocked during import; the last selected file wins. A committed import invalidates previous editors and gestures. Unknown keys and nested formats are retained with appropriate notices.
- Effective values and stored originals are distinguished. Explicit Apply writes the chosen key; browsing and cancellation keep missing keys absent. Export names identify the official demo, source filename and timestamp.
- The embedded vehicle catalog is based on upstream vehicle definitions. A device may include additional vehicles that are absent from this catalog; existing backup values for those vehicles are preserved.
- Per-vehicle popular values come from the Comma server and are unavailable offline, so the demo labels them as unavailable instead of inventing statistics.

Recognized Hyundai/Kia/Genesis and Toyota/Lexus models follow the official visibility rules. The device uses its live fingerprint; the demo uses the chosen vehicle and available backup information. `LongitudinalPersonalityMax` limits gap levels to 3 or 4. Hidden or out of range backup values stay intact until edited. The six ONNX lane/BSD detail values remain under **상세 설정** (Details), following `detail_parent`.

**Restore compatibility:** The device skips unsupported and excluded keys such as `DriverMonitoringEnabled`. The strings `"True"` and `"False"` work for BOOL keys, but can fail for INT keys. The demo preserves imported values. Restore can return a response even when some entries fail, and it does not apply the settings screen's range correction. A new demo's default export is different from a full device backup.

### Updates

- **v1.0.19** repairs v1.0.16 update backups being hidden by an older tab draft or a new-demo marker. Conflicting backups require an explicit choice: **구버전 업데이트 백업 사용** (use the legacy update backup) or **이전 탭 보관값 유지** (keep the existing tab backup). Candidates survive reloads before selection. Choose the first option after editing in the older version and updating. Untouched values and unknown keys keep their original JSON tokens.
- **v1.0.18** aligns fractional/boolean INT edits, `"4.0"`/`"4e0"` gap capability and case/whitespace-insensitive language labels with upstream. A touch no longer opens the value editor after a step changes the label width. The settings schema and vehicle catalog are unchanged.
- **v1.0.17** repairs backup lifecycle problems: default exports after reload, reversed import completion, stale editor writes, cross-tab update handoff overwrites and displayed/stored value mismatches. The 212-setting schema and vehicle catalog remain pinned to v1.0.16.
- **v1.0.16** follows official carrot-wip [0df8361](https://github.com/ajouatom/openpilot/commit/0df83618f196357165a29218c9a588b0131c7d20). It adds Manual Turn Indicator and Tesla CAN Red Light Stop, Manual Lane Lamps, Model Desire Lamps and Model Path Lamps. All five default to OFF. Full upstream descriptions, cautions and menu order are included, with revised descriptions for Manual Lane Change Indicator, Always Lateral, Tesla Automatic Turn Signals and Hyundai Camera SCC.
- **v1.0.15** follows official ajouatom/openpilot carrot-wip commit [14c5398](https://github.com/ajouatom/openpilot/commit/14c5398fca00d298c2791ecf43f46b3e3fd6cc38). It adds `CommaPedalEnabled` and updates the pre-turn lane-change setting to a 0–500m distance. Current device code interprets the stored value `1` as the legacy enabled value of 250m.
- The **x1 → x2 → x5 → x10 → x50 → x100** cycle persists per setting in the same browser. Holding ± repeats after 0.9 seconds and then about every 0.16 seconds. Direct entry clamps to the allowed range and rounds to integers, including the **center of gravity ratio** rule of 0 or 31–69.
- The catalog remains at 333 vehicle document names. In v1.0.10, four previously omitted Tesla Model 3/Model Y HW3/HW4 document names were restored, matching the 333-name official catalog. These are corrections to the existing demo, not newly added upstream vehicles.
- The v1.0.7 search behavior is preserved: the input stays mounted during Korean text composition.
- v1.0.6 replaced `DisableDM` in the driver monitoring menu with `DriverMonitoringMode` and `CarrotVisionEnabled`. Imported `DisableDM` values remain in exported backups.
- When opened with an internet connection, the demo checks the latest stable GitHub Release in the background. Open **도구 → 데모 업데이트** (Tools → Demo update) to see the current/latest versions and status or check manually. An **업데이트하기** (Update) button appears when a newer stable version is available.
- On the hosted web demo, the update flow temporarily saves the current backup in browser storage, opens the new version and restores the backup. For important settings, export a JSON backup first as well.
- A downloaded HTML file cannot overwrite itself. Use the update dialog to save a JSON backup, download and open the new HTML, then import the backup.
- Each update contains the complete demo, including parameter definitions, descriptions and menu locations. Official upstream carrot-wip commits are not imported automatically. A maintainer must review upstream changes and publish a new demo Release before it appears here.
- Editing remains available when offline or when GitHub is rate-limited, times out, or has no published release. Prereleases are excluded from normal updates.

### Scope

The embedded upstream definitions currently include **212 parameters** and **333 vehicle document names**. Features that require a device connection—drive controls, logs, terminal and live device settings—are not available. The demo does not invent descriptions when the upstream definition has none.

The demo does not automatically track changes in upstream carrot-wip. Restore compatibility was checked with the official code and a test parameter store; a physical Comma restore and post-restart readback are separate checks.

### Privacy and license

Parameter backups are not uploaded to GitHub. When online, the demo only queries the public GitHub Releases API to check for updates. No GitHub token or device connection details are embedded in the demo.

This demo references settings, vehicle documents and WebCarrot UI from comma.ai openpilot and opendbc. Upstream copyright and MIT license notices are included in [LICENSE](LICENSE) and [LICENSE.opendbc](LICENSE.opendbc). This is not an official WebCarrot distribution; review backup contents before applying them to a device.
