# WebCarrot 오프라인 설정 데모 v1.0.2 | WebCarrot Offline Settings Demo v1.0.2

[데모 바로 실행 · Open the demo](https://fullmetalsonic.github.io/webcarrot-offline-demo/) · [최신 HTML 다운로드 · Download the latest HTML](https://github.com/fullmetalsonic/webcarrot-offline-demo/releases/latest/download/webcarrot-offline-demo.html) · [변경 기록 · Releases](https://github.com/fullmetalsonic/webcarrot-offline-demo/releases)

**한국어** | [English](#english)

WebCarrot 설정 메뉴를 오프라인에서 살펴보고, 차량·파라미터 값을 편집해 백업 JSON으로 주고받는 비공식 데모입니다. 원본 제작자의 공식 웹캐럿이 아니며, 기기와 통신하거나 차량 설정을 직접 적용하지 않습니다.

## 빠른 시작

1. 위의 **데모 바로 실행**을 누릅니다. 오프라인에서 사용하려면 **최신 HTML 다운로드**로 단일 HTML 파일을 저장해 엽니다.
2. **도구 → JSON 백업 불러오기**에서 기존 콤마 파라미터 백업을 선택합니다. 백업이 없으면 데모가 제공하는 원본 기본값으로 시작할 수 있습니다.
3. **설정**에서 분류와 그룹을 따라가거나 검색해 파라미터를 찾습니다. 화면의 스위치·숫자 조절·선택 메뉴로 값을 편집합니다. **기본값** 버튼은 해당 파라미터 하나만 기본값으로 바꿉니다.
4. **도구 → 백업 JSON 내보내기**를 눌러 저장합니다. 이 파일을 받은 사람도 자신의 콤마에서 불러와 동일한 설정값을 적용할 수 있습니다.

휴대폰 브라우저의 뒤로가기는 차량 선택·값 선택창을 닫고, 설정 하위 그룹을 한 단계씩 거슬러 올라갑니다. 설정 첫 화면에서는 브라우저 기본 뒤로가기가 동작합니다.

## 차량 선택과 백업 보존

- 데모에서 **차량 선택**을 누르면 제조사 → 모델 → 확인 순서로 `CarSelected3` 값을 편집합니다. 기기에 즉시 적용되지는 않습니다. 실제 적용은 JSON 백업을 콤마에서 복원한 뒤 재시작해야 합니다.
- 기존 백업을 불러오면 설정 수 차이를 이유로 파라미터를 자동 추가하거나 지우지 않습니다. 모르는 키, 수정하지 않은 값의 자료형과 중첩값은 내보낼 때 유지됩니다. 명시적으로 변경한 값만 저장되며, 선택한 차량은 `CarSelected3`에 기록됩니다.
- 일부 백업은 이진 설정값을 문자열 `"True"`/`"False"`로 저장합니다. 데모 메뉴에 정의된 `min=0, max=1` 파라미터라면 화면에서 `1`/`0`으로 해석해 맞는 토글·선택 상태를 보여줍니다. 사용자가 바꾸기 전에는 원래 문자열을 그대로 내보내며, 편집한 뒤 해당 키만 숫자 문자열 `"0"`/`"1"`로 저장합니다. 현재 메뉴에 정의되지 않은 키의 값은 표시용 변환 없이 원본 그대로 보존합니다.
- 내장 차량 목록은 원본의 차량 정의를 바탕으로 합니다. 기기별 추가 차량은 목록에 없을 수 있습니다. 기존 백업에 있는 그런 값도 그대로 보존됩니다.
- 콤마 서버에서 받는 실제 차종별 인기값은 데모가 알 수 없어 표시하지 않습니다. 오프라인 안내로 구분합니다.

## 업데이트

- 현재 버전은 **v1.0.3**이며, 설정 정의 기준은 `ajouatom/openpilot`의 `carrot` 커밋 [`62d0043`](https://github.com/ajouatom/openpilot/commit/62d004320d5a8683b919379f16811a832a894cf5)입니다.
- 인터넷에 연결된 상태로 데모를 실행하면 최신 정식 Release를 백그라운드에서 확인합니다. **도구 → 데모 업데이트**에서 현재/최신 버전과 상태를 확인하거나 수동으로 다시 확인할 수 있습니다. 새 버전이 있을 때 **업데이트하기**가 나타납니다.
- 웹 데모에서는 업데이트 전에 현재 백업을 브라우저에 임시 보관하고 새 버전을 연 뒤 복원합니다. 업데이트 과정의 문제에 대비해 중요한 값은 먼저 JSON 파일로도 내보내 두세요.
- 다운로드한 HTML은 자기 파일을 직접 덮어쓸 수 없습니다. 업데이트 화면에서 **현재 설정 JSON 백업**을 저장하고, 새 HTML을 내려받아 연 뒤 백업을 다시 불러오세요.
- 업데이트 배포에는 전체 HTML이 포함되므로 새 파라미터뿐 아니라 설명과 메뉴 위치도 함께 갱신됩니다. 원본 carrot 변경을 자동으로 모두 가져오지는 않습니다. 유지보수자가 원본 변경을 검토하고 새 데모 Release를 만들어야 업데이트에 나타납니다.
- 네트워크 오류, 요청 제한, 시간 초과 또는 미배포 상태에서도 현재 설정 편집은 계속 가능합니다. 사전 릴리스는 일반 업데이트로 제공하지 않습니다.

## 데모의 범위

현재 임베디드 원본 정의에는 **파라미터 185개**와 **차량 문서 이름 329개**가 포함됩니다. 서버 연결이 필요한 주행·로그·터미널·실제 장치 설정 기능은 제공하지 않습니다. 원본 정의 자체에 설명이 없는 파라미터에는 데모가 설명을 지어내지 않습니다.

데모는 `carrot` 커밋 `62d004320d5a8683b919379f16811a832a894cf5`의 UI·설정 구조를 참고합니다. 원본 carrot가 바뀌어도 이 저장소의 데모가 자동으로 바뀌지는 않습니다. 원본과 같은 화면인지 확인하는 렌더링 기반 시각 비교는 아직 완료되지 않았습니다.

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
3. Find a parameter in the **설정** (Settings) menu by browsing categories and groups or by searching. Edit values with the displayed switches, numeric controls and choice menus. **기본값** (Default) changes only that parameter.
4. In **도구** (Tools), select **백업 JSON 내보내기** (Export parameter backup) and share the JSON file. Another user can import that file on their Comma device to apply the same parameter values.

On a phone, browser Back closes vehicle and value dialogs first, then walks back through settings groups one level at a time. At the top-level Settings screen, normal browser Back is allowed.

### Vehicle selection and backup preservation

- **차량 선택** (Vehicle selection) edits `CarSelected3` through make → model → confirmation. The demo does not write to a device. To apply the choice, restore the exported JSON on the Comma device and restart it.
- Importing a backup does not add or delete parameters just because the parameter counts differ. Unknown keys and unedited values, including their JSON types and nested structures, are preserved on export. Only explicit edits are saved; the chosen vehicle is recorded as `CarSelected3`.
- Some backups store binary settings as the strings `"True"` or `"False"`. When a parameter is present in the demo schema with `min=0, max=1`, the UI interprets these as `1` and `0` to display the matching toggle or choice. The original string is exported unchanged unless the user edits it. After an explicit edit, only that key is saved as the numeric string `"0"` or `"1"`. Values for unknown parameters are preserved without display conversion.
- The embedded vehicle catalog is based on upstream vehicle definitions. A device may include additional vehicles that are absent from this catalog; existing backup values for those vehicles are preserved.
- Per-vehicle popular values come from the Comma server and are unavailable offline, so the demo labels them as unavailable instead of inventing statistics.

### Updates

- The current demo is **v1.0.3**. Its settings are based on [`ajouatom/openpilot` `carrot` commit `62d0043`](https://github.com/ajouatom/openpilot/commit/62d004320d5a8683b919379f16811a832a894cf5).
- When opened with an internet connection, the demo checks the latest stable GitHub Release in the background. Open **도구 → 데모 업데이트** (Tools → Demo update) to see the current/latest versions and status or check manually. An **업데이트하기** (Update) button appears when a newer stable version is available.
- On the hosted web demo, the update flow temporarily saves the current backup in browser storage, opens the new version and restores the backup. For important settings, export a JSON backup first as well.
- A downloaded HTML file cannot overwrite itself. Use the update dialog to save a JSON backup, download and open the new HTML, then import the backup.
- Each update contains the complete demo, including parameter definitions, descriptions and menu locations. Official upstream carrot commits are not imported automatically. A maintainer must review upstream changes and publish a new demo Release before it appears here.
- Editing remains available when offline or when GitHub is rate-limited, times out, or has no published release. Prereleases are excluded from normal updates.

### Scope

The embedded upstream definitions currently include **185 parameters** and **329 vehicle document names**. Features that require a device connection—drive controls, logs, terminal and live device settings—are not available. The demo does not invent descriptions when the upstream definition has none.

This demo references the UI and settings structure from `carrot` commit `62d004320d5a8683b919379f16811a832a894cf5`. It does not automatically track changes in upstream carrot. A rendered visual comparison against the original WebCarrot screens has not yet been completed.

### Privacy and license

Parameter backups are not uploaded to GitHub. When online, the demo only queries the public GitHub Releases API to check for updates. No GitHub token or device connection details are embedded in the demo.

This demo references settings, vehicle documents and WebCarrot UI from comma.ai openpilot and opendbc. Upstream copyright and MIT license notices are included in [LICENSE](LICENSE) and [LICENSE.opendbc](LICENSE.opendbc). This is not an official WebCarrot distribution; review backup contents before applying them to a device.
