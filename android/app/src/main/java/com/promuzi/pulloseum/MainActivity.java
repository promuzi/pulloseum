package com.promuzi.pulloseum;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 처음 화면 음악(조율 소리 · 전등 베이스)이 화면을 누르기 전에도 나오게 — 웹뷰 기본값은 '사람이 눌러야 소리'
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        getBridge().getWebView().setBackgroundColor(0xFF000000);
        // 전체 화면(2026-10-17 사용자 "앱에서 초반에 핸드폰 위아래 바가 남는데 없애줄 수 있나" → 1.2 "여전히 위아래 하얀 바가 남아 있음"):
        //  위 상태 표시줄 · 아래 탐색 바를 숨김 — 가장자리를 쓸면 잠깐 나타났다 사라짐, 카메라 구멍 자리까지 게임 화면.
        //  1.2 = 웹뷰가 화면을 다 불러온 뒤 · 앱이 다시 보일 때마다 다시 숨김(처음 한 번만 숨기면 웹뷰 · 시작 화면이 다시 보이게 하는 기기가 있음),
        //  숨김이 풀려도 흰 바가 아니라 검은 바(테마 색 · 예전 방식 깃발도 같이)
        hideSystemBars();
        View v = getWindow().getDecorView();
        v.postDelayed(this::hideSystemBars, 400);
        v.postDelayed(this::hideSystemBars, 1500);
        v.postDelayed(this::hideSystemBars, 4000);
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();   // 다른 앱 · 알림을 보고 돌아와도 다시 숨김
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        getWindow().setStatusBarColor(0xFF000000);
        getWindow().setNavigationBarColor(0xFF000000);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View decor = getWindow().getDecorView();
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), decor);
        c.setAppearanceLightStatusBars(false);
        c.setAppearanceLightNavigationBars(false);
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {   // 안드로이드 10 이하 = 예전 방식 깃발
            decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }
}
