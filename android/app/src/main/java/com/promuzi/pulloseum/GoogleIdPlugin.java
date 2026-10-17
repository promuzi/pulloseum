package com.promuzi.pulloseum;

import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

// 앱판 구글 로그인(2026-10-17 사용자 "3번까지 다 하자"): 웹뷰 안에서는 구글이 팝업 로그인을 막아서, 안드로이드 계정 고르기 창(Credential Manager)으로
//  구글 ID 토큰을 받아 화면에 돌려줌 → 화면이 서버 POST /api/google { idToken }(받는 쪽 = 웹 클라이언트 ID — serverClientId로 받은 것)
//  구글 클라우드에 이 앱(패키지 이름 + 서명 키 SHA-1)의 Android 클라이언트가 있어야 창이 뜸(docs/android-capacitor-wrapper.md)
@CapacitorPlugin(name = "GoogleId")
public class GoogleIdPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId = call.getString("serverClientId");
        if (clientId == null || clientId.isEmpty()) { call.reject("구글 로그인 설정이 없어요", "NO_CLIENT"); return; }
        GetSignInWithGoogleOption opt = new GetSignInWithGoogleOption.Builder(clientId).build();   // '구글로 로그인' 단추식 = 늘 계정 고르기 창
        GetCredentialRequest req = new GetCredentialRequest.Builder().addCredentialOption(opt).build();
        CredentialManager cm = CredentialManager.create(getContext());
        cm.getCredentialAsync(getActivity(), req, null, ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse res) {
                    Credential c = res.getCredential();
                    if (c instanceof CustomCredential && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                        try {
                            GoogleIdTokenCredential g = GoogleIdTokenCredential.createFrom(((CustomCredential) c).getData());
                            JSObject r = new JSObject();
                            r.put("idToken", g.getIdToken());
                            r.put("name", g.getGivenName() != null ? g.getGivenName() : g.getDisplayName());
                            call.resolve(r);
                        } catch (Exception e) { call.reject("구글 로그인을 읽지 못했어요", "BAD_TOKEN"); }
                    } else call.reject("구글 계정이 아니에요", "NOT_GOOGLE");
                }
                @Override
                public void onError(GetCredentialException e) {
                    if (e instanceof GetCredentialCancellationException) call.reject("구글 로그인을 그만뒀어요", "CANCELED");
                    else call.reject(e.getMessage() != null ? e.getMessage() : "구글 로그인 실패", e.getType());
                }
            });
    }
}
