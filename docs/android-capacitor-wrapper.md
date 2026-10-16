# 풀로세움 안드로이드 앱 (Capacitor 껍데기)

## 지금 구조 (2026-10-16 — v2로 바꿈)

- 앱은 게임 파일을 안에 넣지 않고 **v2 주소를 여는 껍데기**다: `https://pulloseum.getchat.workers.dev/v2/` (`capacitor.config.json`의 `server.url`).
- 그래서 게임 화면 · 서버를 고치면 Cloudflare에 다시 올리기만 하면(`cf/배포.md`) 앱에도 바로 반영된다. APK를 다시 만들 필요가 없다.
- 진행은 서버 계정에 저장된다(v2). 앱을 지워도 같은 계정으로 들어가면 그대로다.
- 옛 판(v1, 저장소 맨 위 `index.html`)은 GitHub Pages `https://promuzi.github.io/pulloseum/`에 그대로 있다. 앱은 이제 옛 판을 열지 않는다.

### 앱에만 있는 설정

| 설정 | 어디 | 왜 |
|---|---|---|
| 배경 검정 | `capacitor.config.json` `backgroundColor` | 처음 화면이 검은 방이라 켜질 때 흰 화면이 번쩍이지 않게 |
| 사용자 에이전트 끝에 `PulloseumApp/2` | `capacitor.config.json` `android.appendUserAgent` | 화면이 앱 안인지 안다 → 구글 팝업 로그인 단추를 숨김(아래) |
| 시스템 막대 밑으로 안 들어가게 | `capacitor.config.json` `android.adjustMarginsForEdgeToEdge: "auto"` | 안드로이드 15부터 화면이 상태 막대 밑까지 그려져 위 띠가 가려지는 것 막기 |
| 소리가 누르기 전에도 나옴 | `android/app/src/main/java/com/promuzi/pulloseum/MainActivity.java` | 웹뷰 기본값은 '사람이 눌러야 소리' — 처음 화면 음악(조율 소리 · 전등 베이스)이 바로 나오게. 브라우저판은 그대로 '화면을 누르면 시작해요' |
| 세로 고정 | `android/app/src/main/AndroidManifest.xml` `screenOrientation="portrait"` | 화면이 세로 전용 |

위 설정을 바꾸면 APK를 다시 만들어야 한다(아래 빌드). 앱 이름 · 아이콘 · 패키지명 · 권한 · 플러그인 · `server.url` · 버전도 마찬가지.

## 빌드 (이 기기 = MSI)

있는 것: Android Studio 내장 JDK(`C:\Program Files\Android\Android Studio\jbr`) · SDK(`%LOCALAPPDATA%\Android\Sdk`, 플랫폼 35 · 36.1). 처음 한 번은 Capacitor 패키지(`npm install`)와 Gradle 8.11.1 · 안드로이드 빌드 도구를 내려받는다(합쳐 수백 MB).

PowerShell:
```
cd C:\dev\pulloseum
npm install
npx cap sync android
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat assembleDebug
```
성공하면 `BUILD SUCCESSFUL`, APK = `C:\dev\pulloseum\android\app\build\outputs\apk\debug\app-debug.apk`.

Android Studio로 하려면 `File > Open`에서 `C:\dev\pulloseum\android`를 열고 `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

## 폰에 설치

1. 폰 `설정 > 휴대전화 정보 > 빌드 번호` 7번 → 개발자 옵션 → `USB 디버깅` 켜기 → USB 연결 → 폰에서 허용.
2. PowerShell:
```
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "C:\dev\pulloseum\android\app\build\outputs\apk\debug\app-debug.apk"
```
케이블 없이: APK 파일을 폰으로 보내 열기(출처를 알 수 없는 앱 허용 필요).

## 앱판 구글 로그인 (남은 일)

- 구글은 앱 속 웹뷰에서 팝업 로그인을 막는다(`disallowed_useragent`). 그래서 앱에서는 '구글로 계속하기' 단추를 숨겨 두었다(`v2/src/scenes/title.js inApp`). 아이디 · 비밀번호 로그인은 앱에서도 된다.
- 켜려면: 네이티브 구글 로그인 플러그인(예: `@capgo/capacitor-social-login`) → 구글이 준 **ID 토큰**을 `POST /api/google { idToken }`로. 서버는 이미 ID 토큰을 받는다(받는 쪽 = 웹 클라이언트 ID · 발급 = 구글 · 안 지남 — `server/api.mjs googleWho`, 시험 `tools/test/google.mjs`).
- 필요한 것: 구글 클라우드에 **Android 클라이언트 ID**(패키지 `com.promuzi.pulloseum` + 서명 키 SHA-1 — 디버그 키와 출시 키 둘 다) 추가, 플러그인 설치 · `npx cap sync android`, `title.js`에서 앱이면 플러그인으로 로그인하는 갈래.

## 플레이 스토어 출시 체크리스트

- [ ] 구글 플레이 개발자 계정(사용자 — 등록비 · 본인 확인). 새 개인 계정은 프로덕션 전에 **비공개 테스트**(테스터 여러 명 · 2주)를 요구할 수 있다 — 계정을 만들 때 콘솔 안내를 확인.
- [ ] **새** 업로드 키 만들기 · 보관(깃 금지 — 잃으면 업데이트 불가). 출시 묶음 = `.\gradlew.bat bundleRelease`(AAB). ⚠ 지금 서명 키 `android/app/pulloseum.keystore`는 2026-10-16까지 공개 저장소에 비밀번호와 함께 올라가 있던 키라 시험 빌드에만 쓴다(저장소에서는 뺐고, 비밀번호는 깃 밖 `android/keystore.properties` — 이 PC에만 있음, 없으면 기본 디버그 키로 서명). 새 키를 만들면 같은 파일의 값만 바꾼다.
- [ ] 앱판 구글 로그인용 **Android 클라이언트**(구글 클라우드 → 클라이언트 만들기 → Android): 패키지 이름 `com.promuzi.pulloseum` + 서명 키 SHA-1(시험 키 · 플레이 앱 서명 키 각각 하나씩).
- [ ] 버전 `android/app/build.gradle`의 `versionCode`(올릴 때마다 +1) · `versionName`.
- [ ] 타깃 API: 출시 시점 구글 요구치를 콘솔에서 확인(지금 `variables.gradle` = 35. 2026-08-31부터 새 앱은 36을 요구할 가능성이 큼 → Capacitor 판 올림이 필요할 수 있음).
- [ ] 아이콘 · 시작 화면(지금은 Capacitor 기본) — 그림은 코덱스, `android/app/src/main/res/mipmap-*` · `drawable*`.
- [ ] 스토어 자산: 앱 아이콘 512 · 그래픽 이미지 1024×500 · 휴대전화 스크린샷 2장 이상 · 짧은 설명 · 자세한 설명.
- [ ] **개인정보처리방침 주소**(필수 — 계정 아이디 · 닉네임 · 구글 계정 번호 · 플레이 기록 · 접속 IP(가입 · 시도 제한)를 서버에 저장). 웹 주소 하나에 올려 두고 콘솔에 적는다.
- [ ] 데이터 보안 양식(위 수집 항목 · 암호화 전송 · 계정 삭제 방법), 콘텐츠 등급 설문, 광고 없음 · 앱 내 결제 없음 표시.
- [x] 계정 삭제 길(구글 정책 — 앱 안 + 웹에서 삭제 요청 방법): 설정 → '계정 지우기'(아이디 계정 = 비밀번호 · 구글 계정 = '지우기') → 서버 `POST /api/account/delete`가 계정 · 로그인 열쇠 · 저장 · 봇 판 · 플레이 기록을 모두 지움(시험 `tools/test/google.mjs`). 콘솔의 '웹 삭제 요청 주소' = 게임 주소 `https://pulloseum.getchat.workers.dev/v2/` + "로그인 → 설정 → 계정 지우기" 안내.

## 옛 판(v1) 앱 이야기

예전 앱은 `https://promuzi.github.io/pulloseum/`(v1)을 열었고, 세이브가 웹뷰 localStorage라 `@capacitor/preferences`로 한 부 더 복사했다(`index.html saveState`/`reconcileNativeSave`). v2는 서버 저장이라 필요 없지만 의존성은 남겨 두었다(해 없음).
