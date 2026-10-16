package com.promuzi.pulloseum;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 처음 화면 음악(조율 소리 · 전등 베이스)이 화면을 누르기 전에도 나오게 — 웹뷰 기본값은 '사람이 눌러야 소리'
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
