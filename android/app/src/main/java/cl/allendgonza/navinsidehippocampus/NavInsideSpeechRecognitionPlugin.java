package cl.allendgonza.navinsidehippocampus;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "NavInsideSpeechRecognition",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class NavInsideSpeechRecognitionPlugin extends Plugin implements RecognitionListener {
    private SpeechRecognizer recognizer;
    private String language = "es-CL";

    @PluginMethod
    public void start(PluginCall call) {
        language = call.getString("language", "es-CL");
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionResult");
            return;
        }
        startRecognition(call);
    }

    @PermissionCallback
    private void microphonePermissionResult(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission was denied", "not-allowed");
            return;
        }
        startRecognition(call);
    }

    private void startRecognition(PluginCall call) {
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("Speech recognition is unavailable on this device", "recognition-unavailable");
            return;
        }

        try {
            stopRecognizer();
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(this);
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            recognizer.startListening(intent);
            call.resolve();
        } catch (Exception error) {
            stopRecognizer();
            call.reject("Could not start speech recognition", "recognition-error", error);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopRecognizer();
        call.resolve();
    }

    private void stopRecognizer() {
        if (recognizer != null) {
            try {
                recognizer.cancel();
                recognizer.destroy();
            } catch (Exception ignored) {}
            recognizer = null;
        }
    }

    private void publishError(int errorCode) {
        JSObject event = new JSObject();
        event.put("code", errorName(errorCode));
        notifyListeners("error", event);
        stopRecognizer();
    }

    private String errorName(int code) {
        if (code == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) return "not-allowed";
        if (code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT || code == SpeechRecognizer.ERROR_NO_MATCH) return "no-speech";
        if (code == SpeechRecognizer.ERROR_NETWORK || code == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) return "network";
        return "recognition-error";
    }

    @Override public void onResults(Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) {
            publishError(SpeechRecognizer.ERROR_NO_MATCH);
            return;
        }
        JSObject event = new JSObject();
        event.put("transcript", matches.get(0));
        notifyListeners("result", event);
        stopRecognizer();
    }

    @Override public void onError(int error) { publishError(error); }
    @Override public void onReadyForSpeech(Bundle params) {}
    @Override public void onBeginningOfSpeech() {}
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onEndOfSpeech() {}
    @Override public void onPartialResults(Bundle partialResults) {}
    @Override public void onEvent(int eventType, Bundle params) {}
}
