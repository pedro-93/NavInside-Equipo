package cl.allendgonza.navinsidehippocampus;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.location.LocationManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;

@CapacitorPlugin(
    name = "NavInsideWifi",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class NavInsideWifiPlugin extends Plugin {

    private final Handler mainHandler =
        new Handler(Looper.getMainLooper());

    private PluginCall pendingCall;
    private BroadcastReceiver receiver;
    private Runnable timeout;
    private long lastScanMs = -35000L;
    private boolean destroyed;

    @PluginMethod
    public void scan(PluginCall call) {
        mainHandler.post(() -> {
            if (destroyed) {
                call.reject(
                    "Wi-Fi plugin is closed",
                    "unavailable"
                );
                return;
            }

            if (
                getPermissionState("location") !=
                PermissionState.GRANTED
            ) {
                requestPermissionForAlias(
                    "location",
                    call,
                    "locationPermissionResult"
                );
                return;
            }

            beginScan(call);
        });
    }

    @PermissionCallback
    private void locationPermissionResult(
        PluginCall call
    ) {
        mainHandler.post(() -> {
            if (
                getPermissionState("location") !=
                PermissionState.GRANTED
            ) {
                call.reject(
                    "Precise location permission is required for Wi-Fi scanning",
                    "not-allowed"
                );
                return;
            }

            beginScan(call);
        });
    }

    @SuppressWarnings("deprecation")
    private void beginScan(PluginCall call) {
        if (destroyed) {
            call.reject(
                "Wi-Fi plugin is closed",
                "unavailable"
            );
            return;
        }

        if (pendingCall != null) {
            call.reject(
                "Another Wi-Fi scan is running",
                "busy"
            );
            return;
        }

        long now = SystemClock.elapsedRealtime();

        if (now - lastScanMs < 35000L) {
            call.reject(
                "Wait at least 35 seconds between Wi-Fi scans",
                "throttled"
            );
            return;
        }

        Context context =
            getContext().getApplicationContext();

        WifiManager wifi =
            (WifiManager) context.getSystemService(
                Context.WIFI_SERVICE
            );

        if (wifi == null || !wifi.isWifiEnabled()) {
            call.reject(
                "Wi-Fi is disabled or unavailable",
                "wifi-disabled"
            );
            return;
        }

        LocationManager location =
            (LocationManager) context.getSystemService(
                Context.LOCATION_SERVICE
            );

        if (
            Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.P &&
            (
                location == null ||
                !location.isLocationEnabled()
            )
        ) {
            call.reject(
                "Enable device location to scan Wi-Fi",
                "location-disabled"
            );
            return;
        }

        pendingCall = call;

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(
                Context ignored,
                Intent intent
            ) {
                if (
                    !WifiManager.SCAN_RESULTS_AVAILABLE_ACTION
                        .equals(intent.getAction()) ||
                    pendingCall == null
                ) {
                    return;
                }

                if (
                    !intent.getBooleanExtra(
                        WifiManager.EXTRA_RESULTS_UPDATED,
                        false
                    )
                ) {
                    rejectPending(
                        "Wi-Fi results were not updated",
                        "scan-failed"
                    );
                    return;
                }

                publishResults(wifi);
            }
        };

        try {
            ContextCompat.registerReceiver(
                context,
                receiver,
                new IntentFilter(
                    WifiManager.SCAN_RESULTS_AVAILABLE_ACTION
                ),
                ContextCompat.RECEIVER_EXPORTED
            );

            timeout = () -> rejectPending(
                "Wi-Fi scan timed out",
                "timeout"
            );

            mainHandler.postDelayed(
                timeout,
                15000L
            );

            lastScanMs = now;

            if (!wifi.startScan()) {
                rejectPending(
                    "Android could not start a fresh scan",
                    "scan-failed"
                );
            }
        } catch (SecurityException error) {
            rejectPending(
                "Wi-Fi scan permission was denied",
                "not-allowed"
            );
        } catch (Exception error) {
            rejectPending(
                "Wi-Fi scan could not start",
                "scan-failed"
            );
        }
    }

    @SuppressWarnings("deprecation")
    private void publishResults(
        WifiManager wifi
    ) {
        try {
            List<ScanResult> results =
                wifi.getScanResults();

            JSArray networks = new JSArray();

            long nowUs =
                SystemClock.elapsedRealtimeNanos() /
                1000L;

            for (ScanResult result : results) {
                long ageMs =
                    (nowUs - result.timestamp) /
                    1000L;

                if (
                    result.timestamp <= 0 ||
                    ageMs < 0 ||
                    ageMs > 30000L
                ) {
                    continue;
                }

                JSObject item = new JSObject();

                item.put(
                    "ssid",
                    result.SSID == null
                        ? ""
                        : result.SSID
                );

                item.put(
                    "bssid",
                    result.BSSID == null
                        ? ""
                        : result.BSSID
                );

                item.put(
                    "rssi",
                    result.level
                );

                item.put(
                    "frequency",
                    result.frequency
                );

                item.put(
                    "ageMs",
                    ageMs
                );

                networks.put(item);
            }

            JSObject response = new JSObject();

            response.put(
                "networks",
                networks
            );

            response.put(
                "timestamp",
                System.currentTimeMillis()
            );

            PluginCall call = pendingCall;

            cleanup();

            if (call != null) {
                call.resolve(response);
            }
        } catch (SecurityException error) {
            rejectPending(
                "Wi-Fi scan permission was denied",
                "not-allowed"
            );
        } catch (Exception error) {
            rejectPending(
                "Wi-Fi results could not be read",
                "scan-failed"
            );
        }
    }

    private void rejectPending(
        String message,
        String code
    ) {
        PluginCall call = pendingCall;

        cleanup();

        if (call != null) {
            call.reject(
                message,
                code
            );
        }
    }

    private void cleanup() {
        pendingCall = null;

        if (timeout != null) {
            mainHandler.removeCallbacks(timeout);
            timeout = null;
        }

        if (receiver != null) {
            try {
                getContext()
                    .getApplicationContext()
                    .unregisterReceiver(receiver);
            } catch (IllegalArgumentException ignored) {
                // El registro pudo fallar antes de adjuntar el receptor.
            }

            receiver = null;
        }
    }

    @Override
    protected void handleOnPause() {
        mainHandler.post(
            () -> rejectPending(
                "Wi-Fi scan was interrupted",
                "cancelled"
            )
        );
    }

    @Override
    protected void handleOnDestroy() {
        mainHandler.post(() -> {
            destroyed = true;

            rejectPending(
                "Wi-Fi plugin was closed",
                "cancelled"
            );
        });
    }
}