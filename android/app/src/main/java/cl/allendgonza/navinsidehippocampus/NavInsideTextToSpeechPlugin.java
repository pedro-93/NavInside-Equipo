package cl.allendgonza.navinsidehippocampus;

import android.media.AudioAttributes;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "NavInsideTextToSpeech")
public class NavInsideTextToSpeechPlugin extends Plugin {
    private final Handler mainHandler =
        new Handler(Looper.getMainLooper());

    private TextToSpeech engine;
    private boolean ready = false;
    private boolean destroyed = false;
    private PluginCall pendingCall;
    private String activeUtteranceId;

    private final Runnable initializationTimeout = () -> {
        if (!ready) {
            rejectPending(
                "Text-to-speech initialization timed out",
                "tts-initialization-timeout"
            );
            releaseEngine();
        }
    };

    @PluginMethod
    public void speak(PluginCall call) {
        mainHandler.post(() -> {
            if (destroyed) {
                call.reject(
                    "Text-to-speech plugin has been destroyed",
                    "tts-unavailable"
                );
                return;
            }

            String text = call.getString("text", "");

            if (text == null || text.trim().isEmpty()) {
                call.reject("Text is empty", "tts-empty-text");
                return;
            }

            if (text.length() > TextToSpeech.getMaxSpeechInputLength()) {
                call.reject("Text is too long", "tts-text-too-long");
                return;
            }

            rejectPending(
                "Speech was replaced by a new request",
                "tts-cancelled"
            );

            if (engine != null && ready) {
                engine.stop();
            }

            pendingCall = call;

            if (ready && engine != null) {
                speakPending();
            } else if (engine == null) {
                initializeEngine();
            }
        });
    }

    private void initializeEngine() {
        ready = false;
        mainHandler.removeCallbacks(initializationTimeout);
        mainHandler.postDelayed(initializationTimeout, 15000);

        try {
            engine = new TextToSpeech(
                getContext().getApplicationContext(),
                status -> mainHandler.post(() -> {
                    if (destroyed || engine == null) {
                        return;
                    }

                    mainHandler.removeCallbacks(initializationTimeout);

                    if (status != TextToSpeech.SUCCESS) {
                        rejectPending(
                            "Could not initialize Android text-to-speech",
                            "tts-initialization-error"
                        );
                        releaseEngine();
                        return;
                    }

                    engine.setOnUtteranceProgressListener(
                        new UtteranceProgressListener() {
                            @Override
                            public void onStart(String utteranceId) {}

                            @Override
                            public void onDone(String utteranceId) {
                                mainHandler.post(() ->
                                    finishUtterance(utteranceId, false)
                                );
                            }

                            @Override
                            public void onError(String utteranceId) {
                                mainHandler.post(() ->
                                    finishUtterance(utteranceId, true)
                                );
                            }

                            @Override
                            public void onError(
                                String utteranceId,
                                int errorCode
                            ) {
                                mainHandler.post(() ->
                                    finishUtterance(utteranceId, true)
                                );
                            }

                            @Override
                            public void onStop(
                                String utteranceId,
                                boolean interrupted
                            ) {
                                mainHandler.post(() -> {
                                    if (
                                        utteranceId != null &&
                                        utteranceId.equals(activeUtteranceId)
                                    ) {
                                        rejectPending(
                                            "Speech was stopped",
                                            "tts-cancelled"
                                        );
                                    }
                                });
                            }
                        }
                    );

                    engine.setAudioAttributes(
                        new AudioAttributes.Builder()
                            .setUsage(
                                AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE
                            )
                            .setContentType(
                                AudioAttributes.CONTENT_TYPE_SPEECH
                            )
                            .build()
                    );

                    ready = true;
                    speakPending();
                })
            );
        } catch (Exception error) {
            rejectPending(
                "Could not create Android text-to-speech",
                "tts-initialization-error"
            );
            releaseEngine();
        }
    }

    private void speakPending() {
        if (!ready || engine == null || pendingCall == null) {
            return;
        }

        try {
            String language = pendingCall.getString("language", "es-CL");
            Locale locale = Locale.forLanguageTag(
                language == null ? "es-CL" : language
            );

            int languageResult = engine.setLanguage(locale);

            if (languageResult == TextToSpeech.LANG_MISSING_DATA) {
                rejectPending(
                    "Voice data for the selected language is missing",
                    "tts-language-missing"
                );
                return;
            }

            if (languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                rejectPending(
                    "The selected voice language is not supported",
                    "tts-language-unsupported"
                );
                return;
            }

            Double requestedRate = pendingCall.getDouble("rate", 0.92);
            double rate = requestedRate == null ? 0.92 : requestedRate;

            if (!Double.isFinite(rate)) {
                rate = 0.92;
            }

            engine.setSpeechRate(
                (float) Math.max(0.5, Math.min(1.5, rate))
            );
            engine.setPitch(1.0f);

            Bundle parameters = new Bundle();
            parameters.putFloat(
                TextToSpeech.Engine.KEY_PARAM_VOLUME,
                1.0f
            );

            activeUtteranceId = UUID.randomUUID().toString();

            int result = engine.speak(
                pendingCall.getString("text", ""),
                TextToSpeech.QUEUE_FLUSH,
                parameters,
                activeUtteranceId
            );

            if (result == TextToSpeech.ERROR) {
                rejectPending(
                    "Android could not start speaking",
                    "tts-speak-error"
                );
            }
        } catch (Exception error) {
            rejectPending(
                "Android text-to-speech failed",
                "tts-speak-error"
            );
        }
    }

    private void finishUtterance(String utteranceId, boolean failed) {
        if (
            utteranceId == null ||
            !utteranceId.equals(activeUtteranceId)
        ) {
            return;
        }

        if (failed) {
            rejectPending(
                "Android could not finish speaking",
                "tts-speak-error"
            );
            return;
        }

        PluginCall completedCall = pendingCall;
        pendingCall = null;
        activeUtteranceId = null;

        if (completedCall != null) {
            completedCall.resolve();
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        mainHandler.post(() -> {
            rejectPending("Speech was stopped", "tts-cancelled");

            if (engine != null && ready) {
                engine.stop();
            }

            call.resolve();
        });
    }

    private void rejectPending(String message, String code) {
        PluginCall previousCall = pendingCall;
        pendingCall = null;
        activeUtteranceId = null;

        if (previousCall != null) {
            previousCall.reject(message, code);
        }
    }

    private void releaseEngine() {
        mainHandler.removeCallbacks(initializationTimeout);
        ready = false;

        TextToSpeech previousEngine = engine;
        engine = null;

        if (previousEngine != null) {
            previousEngine.shutdown();
        }
    }

    @Override
    protected void handleOnDestroy() {
        mainHandler.post(() -> {
            destroyed = true;
            rejectPending(
                "Text-to-speech plugin was destroyed",
                "tts-cancelled"
            );
            releaseEngine();
        });

        super.handleOnDestroy();
    }
}