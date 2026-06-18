# 풀로세움 Android 개발용 앱 포장 가이드

이 프로젝트는 기존 `index.html`을 앱 안에 넣지 않고, Capacitor Android 앱이 아래 원격 주소를 여는 방식으로 포장한다.

```text
https://promuzi.github.io/pulloseum/
```

현재 저장소에는 Capacitor Android 프로젝트가 이미 추가되어 있다. 기존 게임 파일 구조는 그대로 유지한다.

## 현재 완료된 것

- `package.json`, `package-lock.json` 추가
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` 설치
- `capacitor.config.json` 추가
- `android/` 프로젝트 생성
- 개발용 APK 빌드 성공 확인
- 생성된 APK 위치:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 1. 설치 여부 확인

PowerShell을 열고 프로젝트 폴더로 이동한다.

```powershell
cd "C:\Users\soosa\OneDrive\문서\풀로세움"
```

Node.js 확인:

```powershell
& "C:\Program Files\nodejs\node.exe" --version
& "C:\Program Files\nodejs\npm.cmd" --version
```

현재 확인된 버전:

```text
Node.js v24.17.0
npm 11.13.0
```

Android Studio 내장 JDK 확인:

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" -version
```

현재 확인된 버전:

```text
OpenJDK 21.0.10
```

Android SDK 확인:

```powershell
Test-Path "$env:LOCALAPPDATA\Android\Sdk"
```

`True`가 나오면 SDK 폴더가 있다.

### 설치가 안 되어 있다면

Node.js:

1. https://nodejs.org 접속
2. LTS 버전 다운로드
3. 설치 중 옵션은 기본값 그대로 진행
4. 설치 후 PowerShell을 새로 열고 `node --version`, `npm --version` 확인

Android Studio:

1. https://developer.android.com/studio 접속
2. Android Studio 다운로드 및 설치
3. Android Studio 실행
4. 처음 실행 마법사에서 `Standard` 선택
5. 설치가 끝나면 시작 화면에서 `More Actions` 클릭
6. `SDK Manager` 클릭
7. `SDK Platforms` 탭에서 `Android 15.0 (API 35)` 체크
8. `SDK Tools` 탭에서 아래 항목 체크
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android SDK Command-line Tools
9. `Apply` 클릭 후 설치 완료까지 기다림

JDK는 Android Studio 안에 포함된 JDK를 쓰면 된다. 별도로 Java를 설치하지 않아도 된다.

## 2. Capacitor 설치와 초기화

이 프로젝트는 이미 초기화되어 있으므로, 새 PC에서 처음 받을 때는 보통 이것만 실행하면 된다.

```powershell
cd "C:\Users\soosa\OneDrive\문서\풀로세움"
& "C:\Program Files\nodejs\npm.cmd" install
```

처음부터 직접 만드는 경우의 기본 명령은 아래와 같다.

```powershell
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "풀로세움" "com.promuzi.pulloseum" --web-dir www
```

이 폴더처럼 경로나 폴더명이 한글이면 `npm init -y`가 패키지명을 한글로 잡아 실패할 수 있다. 그 경우 `package.json`의 `"name"`은 `pulloseum`처럼 영문 소문자로 둔다.

`npx` 실행 중 `"node" is not recognized`가 나오면 PowerShell에서 먼저 PATH를 보정한다.

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

## 3. Capacitor 설정

핵심 설정 파일은 `capacitor.config.json`이다.

```json
{
  "appId": "com.promuzi.pulloseum",
  "appName": "풀로세움",
  "webDir": "www",
  "server": {
    "url": "https://promuzi.github.io/pulloseum/",
    "cleartext": false
  }
}
```

`server.url`이 있으므로 앱은 내장된 게임 파일이 아니라 GitHub Pages 주소를 연다.

`www/index.html`은 Capacitor가 요구하는 최소 자리표시자다. 실제 게임 `index.html`을 앱에 넣은 것이 아니다.

설정을 바꾼 뒤 Android 프로젝트에 반영하려면:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npx.cmd" cap sync android
```

## 4. Android 프로젝트 생성

처음 한 번만 실행한다.

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npx.cmd" cap add android
```

이미 `android/` 폴더가 있으면 다시 실행하지 않아도 된다.

## 5. APK 만들기

### 방법 A: Android Studio에서 만들기

1. Android Studio 실행
2. `File` > `Open` 클릭
3. 아래 폴더 선택

```text
C:\Users\soosa\OneDrive\문서\풀로세움\android
```

4. 오른쪽 아래 또는 상단에 `Gradle Sync`가 돌면 끝날 때까지 기다림
5. 상단 메뉴에서 `Build` 클릭
6. `Build Bundle(s) / APK(s)` 클릭
7. `Build APK(s)` 클릭
8. 빌드가 끝나면 오른쪽 아래 알림에서 `locate` 클릭

APK 위치:

```text
C:\Users\soosa\OneDrive\문서\풀로세움\android\app\build\outputs\apk\debug\app-debug.apk
```

### 방법 B: PowerShell에서 만들기

```powershell
cd "C:\Users\soosa\OneDrive\문서\풀로세움\android"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
.\gradlew.bat assembleDebug
```

성공하면 마지막에 `BUILD SUCCESSFUL`이 나온다.

한글 경로 때문에 Gradle이 막히는 문제를 피하려고 `android/gradle.properties`에 아래 설정을 추가해두었다.

```properties
android.overridePathCheck=true
```

## 6. 폰에 설치하기

### Android Studio로 설치

1. Android 폰에서 `설정` 열기
2. `휴대전화 정보` 또는 `디바이스 정보`로 이동
3. `빌드 번호`를 7번 연속 터치해서 개발자 옵션 켜기
4. `설정` > `개발자 옵션` 이동
5. `USB 디버깅` 켜기
6. USB 케이블로 PC와 연결
7. 폰에 `USB 디버깅을 허용하시겠습니까?`가 뜨면 `허용`
8. Android Studio 상단 기기 선택 드롭다운에서 내 폰 선택
9. 초록색 실행 버튼 클릭

### PowerShell로 설치

폰을 USB로 연결한 뒤:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_HOME\platform-tools\adb.exe" devices
```

기기 목록에 `device`라고 나오면 설치한다.

```powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r "C:\Users\soosa\OneDrive\문서\풀로세움\android\app\build\outputs\apk\debug\app-debug.apk"
```

폰이 연결되지 않은 현재 상태에서는 `adb devices` 결과가 빈 목록으로 나온다.

## 7. 게임 수정 후 앱 반영 방식

이 앱은 원격 URL을 여는 껍데기 앱이다. 따라서 게임 내용만 바꿀 때는 APK를 다시 만들 필요가 없다.

게임 수정 후:

```powershell
git add index.html
git commit -m "Update game"
git push
```

GitHub Pages 배포가 끝나면 앱을 다시 열었을 때 최신 웹게임이 표시된다.

다만 아래 변경은 APK를 다시 빌드해야 한다.

- 앱 이름 변경
- 아이콘/스플래시 변경
- 패키지명 변경
- 권한 추가
- Capacitor 플러그인 추가
- `server.url` 변경
- Play Store 출시용 서명/버전 변경

주의할 점:

- 앱 안의 저장 데이터는 Android WebView의 localStorage에 저장된다.
- GitHub Pages의 웹 파일이 바뀌어도 같은 URL이면 보통 세이브는 유지된다.
- 앱을 삭제하면 앱 WebView localStorage도 같이 지워질 수 있다.
- 인터넷이 안 되거나 GitHub Pages가 내려가면 게임을 불러오지 못한다.
