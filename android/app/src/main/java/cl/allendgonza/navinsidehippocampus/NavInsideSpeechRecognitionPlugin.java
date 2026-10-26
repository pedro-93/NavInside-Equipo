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
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class NavInsideSpeechRecognitionPlugin
    extends Plugin
    implements RecognitionListener {

    private SpeechRecognizer recognizer;

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias(
                "microphone",
                call,
                "microphonePermissionResult"
            );
            return;
        }

        startRecognition(call);
    }

    @PermissionCallback
    private void microphonePermissionResult(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject(
                "Microphone permission was denied",
                "not-allowed"
            );
            return;
        }

        startRecognition(call);
    }

    private void startRecognition(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                    call.reject(
                        "Speech recognition is unavailable on this device",
                        "recognition-unavailable"
                    );
                    return;
                }

                stopRecognizer();

                recognizer = SpeechRecognizer.createSpeechRecognizer(
                    getContext()
                );
                recognizer.setRecognitionListener(this);

                Intent intent = new Intent(
                    RecognizerIntent.ACTION_RECOGNIZE_SPEECH
                );

                intent.putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                );
                intent.putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE,
                    call.getString("language", "es-CL")
                );
                intent.putExtra(
                    RecognizerIntent.EXTRA_PARTIAL_RESULTS,
                    false
                );
                intent.putExtra(
                    RecognizerIntent.EXTRA_MAX_RESULTS,
                    1
                );

                recognizer.startListening(intent);
                call.resolve();
            } catch (Exception error) {
                stopRecognizer();
                call.reject(
                    "Could not start speech recognition",
                    "recognition-error",
                    error
                );
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopRecognizer();
            call.resolve();
        });
    }

    private void stopRecognizer() {
        SpeechRecognizer previousRecognizer = recognizer;
        recognizer = null;

        if (previousRecognizer == null) {
            return;
        }

        try {
            previousRecognizer.cancel();
        } catch (Exception ignored) {
            // Se intenta liberar el reconocedor aunque cancelar falle.
        }

        try {
            previousRecognizer.destroy();
        } catch (Exception ignored) {
            // El reconocedor puede haber sido liberado previamente.
        }
    }

    private void publishError(int errorCode) {
        stopRecognizer();

        JSObject event = new JSObject();
        event.put("code", errorName(errorCode));
        notifyListeners("error", event);
    }

    private String errorName(int code) {
        if (code == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
            return "not-allowed";
        }

        if (
            code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ||
            code == SpeechRecognizer.ERROR_NO_MATCH
        ) {
            return "no-speech";
        }

        if (
            code == SpeechRecognizer.ERROR_NETWORK ||
            code == SpeechRecognizer.ERROR_NETWORK_TIMEOUT
        ) {
            return "network";
        }

        return "recognition-error";
    }

    @Override
    public void onResults(Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(
            SpeechRecognizer.RESULTS_RECOGNITION
        );

        if (matches == null || matches.isEmpty()) {
            publishError(SpeechRecognizer.ERROR_NO_MATCH);
            return;
        }

        String transcript = matches.get(0);
        stopRecognizer();

        JSObject event = new JSObject();
        event.put("transcript", transcript);
        notifyListeners("result", event);
    }

    @Override
    public void onError(int error) {
        publishError(error);
    }

    @Override
    public void onReadyForSpeech(Bundle params) {}

    @Override
    public void onBeginningOfSpeech() {}

    @Override
    public void onRmsChanged(float rmsdB) {}

    @Override
    public void onBufferReceived(byte[] buffer) {}

    @Override
    public void onEndOfSpeech() {}

    @Override
    public void onPartialResults(Bundle partialResults) {}

    @Override
    public void onEvent(int eventType, Bundle params) {}
}