package com.promuzi.pulloseum;

import android.os.Build;
import android.os.Bundle;
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
        // 전체 화면(2026-10-17 사용자 "앱에서 초반에 핸드폰 위아래 바가 남는데 없애줄 수 있나"): 위 상태 표시줄 · 아래 탐색 바를 숨김 —
        //  가장자리를 쓸면 잠깐 나타났다 사라짐, 카메라 구멍 자리까지 게임 화면
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();   // 다른 앱 · 알림을 보고 돌아와도 다시 숨김
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
