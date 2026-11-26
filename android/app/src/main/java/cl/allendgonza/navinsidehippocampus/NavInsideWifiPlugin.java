package cl.allendgonza.navinsidehippocampus;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.net.wifi.rtt.RangingRequest;
import android.net.wifi.rtt.RangingResult;
import android.net.wifi.rtt.RangingResultCallback;
import android.net.wifi.rtt.WifiRttManager;
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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(
    name = "NavInsideWifi",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        ),
        @Permission(
            alias = "nearby",
            strings = {
                "android.permission.NEARBY_WIFI_DEVICES"
            }
        )
    }
)
public class NavInsideWifiPlugin extends Plugin {

    private static final long INTERVALO_MINIMO_ABSOLUTO_MS = 2000L;
    private static final long INTERVALO_COMPATIBLE_MS = 35000L;
    private static final long EDAD_MAXIMA_MS = 30000L;

    private final Handler mainHandler =
        new Handler(Looper.getMainLooper());

    private PluginCall pendingCall;
    private boolean pendingAllowCached;
    private BroadcastReceiver receiver;
    private BroadcastReceiver passiveReceiver;
    private Runnable timeout;
    private long lastScanMs = -INTERVALO_COMPATIBLE_MS;
    private boolean destroyed;
    private boolean rttBusy;

@PluginMethod
    public void scan(PluginCall call) {
        mainHandler.post(() -> {
            if (destroyed) {
                call.reject("Wi-Fi plugin is closed", "unavailable");
                return;
            }

            if (!hasLocation()) {
                requestPermissionForAlias("location", call, "locationPermissionResult");
                return;
            }

            beginScan(call);
        });
    }

    @PermissionCallback
    private void locationPermissionResult(PluginCall call) {
        mainHandler.post(() -> {
            if (!hasLocation()) {
                call.reject(
                    "Precise location permission is required for Wi-Fi scanning",
                    "not-allowed"
                );
                return;
            }

            String method = call.getMethodName();

            if ("getCachedResults".equals(method)) {
                getCachedResults(call);
            } else if ("getConnectionInfo".equals(method)) {
                getConnectionInfo(call);
            } else if ("startPassive".equals(method)) {
                startPassive(call);
            } else if ("rangeRtt".equals(method)) {
                rangeRtt(call);
            } else {
                beginScan(call);
            }
        });
    }

    @SuppressWarnings("deprecation")
    private void beginScan(PluginCall call) {
        if (destroyed) {
            call.reject("Wi-Fi plugin is closed", "unavailable");
            return;
        }

        boolean allowCached = Boolean.TRUE.equals(call.getBoolean("allowCached", false));
        long minInterval = Math.max(
            INTERVALO_MINIMO_ABSOLUTO_MS,
            call.getLong("minIntervalMs", INTERVALO_COMPATIBLE_MS)
        );

        WifiManager wifi = wifiManager();

        if (pendingCall != null) {
            if (allowCached && wifi != null) {
                resolveCached(call, wifi, "busy");
            } else {
                call.reject("Another Wi-Fi scan is running", "busy");
            }
            return;
        }

        long now = SystemClock.elapsedRealtime();

        if (now - lastScanMs < minInterval) {
            if (allowCached && wifi != null) {
                resolveCached(call, wifi, "throttled");
            } else {
                call.reject(
                    "Wait before requesting another Wi-Fi scan",
                    "throttled"
                );
            }
            return;
        }

        if (wifi == null || !wifi.isWifiEnabled()) {
            call.reject("Wi-Fi is disabled or unavailable", "wifi-disabled");
            return;
        }

        if (!locationEnabled()) {
            call.reject("Enable device location to scan Wi-Fi", "location-disabled");
            return;
        }

        pendingCall = call;
        pendingAllowCached = allowCached;

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ignored, Intent intent) {
                if (
                    !WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(intent.getAction()) ||
                    pendingCall == null
                ) {
                    return;
                }

                boolean updated = intent.getBooleanExtra(
                    WifiManager.EXTRA_RESULTS_UPDATED,
                    false
                );

                if (!updated && !pendingAllowCached) {
                    rejectPending("Wi-Fi results were not updated", "scan-failed");
                    return;
                }

                publishResults(wifi, updated ? null : "not-updated");
            }
        };

        try {
            ContextCompat.registerReceiver(
                appContext(),
                receiver,
                new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION),
                ContextCompat.RECEIVER_NOT_EXPORTED
            );

            timeout = () -> {
                if (pendingAllowCached) {
                    publishResults(wifi, "timeout");
                } else {
                    rejectPending("Wi-Fi scan timed out", "timeout");
                }
            };

            mainHandler.postDelayed(timeout, 15000L);

            if (!wifi.startScan()) {
                if (pendingAllowCached) {
                    publishResults(wifi, "throttled");
                } else {
                    rejectPending("Android could not start a fresh scan", "scan-failed");
                }
                return;
            }

            lastScanMs = now;
        } catch (SecurityException error) {
            rejectPending("Wi-Fi scan permission was denied", "not-allowed");
        } catch (Exception error) {
            rejectPending("Wi-Fi scan could not start", "scan-failed");
        }
    }

@PluginMethod
    public void getCachedResults(PluginCall call) {
        mainHandler.post(() -> {
            if (!hasLocation()) {
                requestPermissionForAlias("location", call, "locationPermissionResult");
                return;
            }

            WifiManager wifi = wifiManager();

            if (wifi == null) {
                call.reject("Wi-Fi is unavailable", "unavailable");
                return;
            }

            resolveCached(call, wifi, "cached");
        });
    }

    @PluginMethod
    public void startPassive(PluginCall call) {
        mainHandler.post(() -> {
            if (!hasLocation()) {
                requestPermissionForAlias("location", call, "locationPermissionResult");
                return;
            }

            WifiManager wifi = wifiManager();

            if (wifi == null) {
                call.reject("Wi-Fi is unavailable", "unavailable");
                return;
            }

            if (passiveReceiver == null) {
                passiveReceiver = new BroadcastReceiver() {
                    @Override
                    public void onReceive(Context ignored, Intent intent) {
                        if (!WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(intent.getAction())) {
                            return;
                        }

                        try {
                            JSObject data = buildResults(wifi);
                            data.put(
                                "updated",
                                intent.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false)
                            );
                            data.put("source", "passive");
                            notifyListeners("scanResults", data);
                        } catch (SecurityException ignoredError) {
                        }
                    }
                };

                ContextCompat.registerReceiver(
                    appContext(),
                    passiveReceiver,
                    new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION),
                    ContextCompat.RECEIVER_NOT_EXPORTED
                );
            }

            call.resolve();
        });
    }

    @PluginMethod
    public void stopPassive(PluginCall call) {
        mainHandler.post(() -> {
            unregisterPassive();
            call.resolve();
        });
    }

@PluginMethod
    @SuppressWarnings("deprecation")
    public void getConnectionInfo(PluginCall call) {
        mainHandler.post(() -> {
            if (!hasLocation()) {
                requestPermissionForAlias("location", call, "locationPermissionResult");
                return;
            }

            WifiManager wifi = wifiManager();
            JSObject response = new JSObject();
            response.put("timestamp", System.currentTimeMillis());

            if (wifi == null || !wifi.isWifiEnabled()) {
                response.put("connected", false);
                call.resolve(response);
                return;
            }

            WifiInfo info = wifi.getConnectionInfo();
            String bssid = info == null ? null : info.getBSSID();

            boolean connected =
                info != null &&
                info.getNetworkId() != -1 &&
                bssid != null &&
                !"02:00:00:00:00:00".equals(bssid) &&
                !"00:00:00:00:00:00".equals(bssid);

            response.put("connected", connected);

            if (connected) {
                String ssid = info.getSSID();

                if (ssid != null && ssid.length() >= 2 && ssid.startsWith("\"") && ssid.endsWith("\"")) {
                    ssid = ssid.substring(1, ssid.length() - 1);
                }

                response.put("ssid", ssid == null ? "" : ssid);
                response.put("bssid", bssid.toLowerCase(Locale.ROOT));
                response.put("rssi", info.getRssi());
                response.put("frequency", info.getFrequency());
                response.put("linkSpeedMbps", info.getLinkSpeed());
            }

            call.resolve(response);
        });
    }

@PluginMethod
    public void capabilities(PluginCall call) {
        mainHandler.post(() -> {
            Context context = appContext();
            WifiManager wifi = wifiManager();
            JSObject response = new JSObject();

            boolean rttFeature = false;
            boolean rttAvailable = false;
            int rttMaxPeers = 0;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                rttFeature = context.getPackageManager()
                    .hasSystemFeature(PackageManager.FEATURE_WIFI_RTT);

                if (rttFeature) {
                    WifiRttManager rtt = (WifiRttManager) context.getSystemService(Context.WIFI_RTT_RANGING_SERVICE);
                    rttAvailable = rtt != null && rtt.isAvailable();
                    rttMaxPeers = RangingRequest.getMaxPeers();
                }
            }

            response.put("sdk", Build.VERSION.SDK_INT);
            response.put("wifiEnabled", wifi != null && wifi.isWifiEnabled());
            response.put("locationEnabled", locationEnabled());
            response.put("locationPermission", hasLocation());
            response.put("rttSupported", rttFeature);
            response.put("rttAvailable", rttAvailable);
            response.put("rttMaxPeers", rttMaxPeers);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && wifi != null) {
                response.put("scanThrottleEnabled", wifi.isScanThrottleEnabled());
            } else {
                response.put("scanThrottleEnabled", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P);
            }

            call.resolve(response);
        });
    }

@PluginMethod
    public void rangeRtt(PluginCall call) {
        mainHandler.post(() -> {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                call.reject("Wi-Fi RTT requires Android 9", "unsupported");
                return;
            }

            if (!hasLocation()) {
                requestPermissionForAlias("location", call, "locationPermissionResult");
                return;
            }

            if (
                Build.VERSION.SDK_INT >= 33 &&
                getPermissionState("nearby") != PermissionState.GRANTED
            ) {
                requestPermissionForAlias("nearby", call, "nearbyPermissionResult");
                return;
            }

            beginRanging(call);
        });
    }

    @PermissionCallback
    private void nearbyPermissionResult(PluginCall call) {
        mainHandler.post(() -> {
            if (getPermissionState("nearby") != PermissionState.GRANTED) {
                call.reject("Nearby Wi-Fi devices permission is required for RTT", "not-allowed");
                return;
            }

            beginRanging(call);
        });
    }

    private void beginRanging(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            call.reject("Wi-Fi RTT requires Android 9", "unsupported");
            return;
        }

        Context context = appContext();

        if (!context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_WIFI_RTT)) {
            call.reject("This phone does not support Wi-Fi RTT", "unsupported");
            return;
        }

        WifiRttManager rtt = (WifiRttManager) context.getSystemService(Context.WIFI_RTT_RANGING_SERVICE);
        WifiManager wifi = wifiManager();

        if (rtt == null || !rtt.isAvailable() || wifi == null) {
            call.reject("Wi-Fi RTT is not available now", "unavailable");
            return;
        }

        if (rttBusy) {
            call.reject("Another RTT request is running", "busy");
            return;
        }

        Set<String> wanted = new HashSet<>();
        JSArray requested = call.getArray("bssids");

        if (requested != null) {
            for (int i = 0; i < requested.length(); ++i) {
                String id = requested.optString(i, "");
                if (!id.isEmpty()) {
                    wanted.add(id.toLowerCase(Locale.ROOT));
                }
            }
        }

        List<ScanResult> responders = new ArrayList<>();

        try {
            for (ScanResult result : wifi.getScanResults()) {
                if (
                    result.BSSID != null &&
                    result.is80211mcResponder() &&
                    (wanted.isEmpty() || wanted.contains(result.BSSID.toLowerCase(Locale.ROOT)))
                ) {
                    responders.add(result);
                }
            }
        } catch (SecurityException error) {
            call.reject("Wi-Fi permission was denied", "not-allowed");
            return;
        }

        if (responders.isEmpty()) {
            JSObject empty = new JSObject();
            empty.put("results", new JSArray());
            empty.put("timestamp", System.currentTimeMillis());
            call.resolve(empty);
            return;
        }

        responders.sort((a, b) -> b.level - a.level);

        RangingRequest.Builder builder = new RangingRequest.Builder();
        int max = RangingRequest.getMaxPeers();

        for (int i = 0; i < responders.size() && i < max; ++i) {
            builder.addAccessPoint(responders.get(i));
        }

        rttBusy = true;

        try {
            rtt.startRanging(
                builder.build(),
                context.getMainExecutor(),
                new RangingResultCallback() {
                    @Override
                    public void onRangingFailure(int code) {
                        rttBusy = false;
                        call.reject("Wi-Fi RTT failed: " + code, "rtt-failed");
                    }

                    @Override
                    public void onRangingResults(List<RangingResult> results) {
                        rttBusy = false;
                        JSArray list = new JSArray();

                        for (RangingResult r : results) {
                            if (r.getMacAddress() == null) {
                                continue;
                            }

                            JSObject item = new JSObject();
                            item.put("bssid", r.getMacAddress().toString().toLowerCase(Locale.ROOT));
                            item.put("ok", r.getStatus() == RangingResult.STATUS_SUCCESS);

                            if (r.getStatus() == RangingResult.STATUS_SUCCESS) {
                                item.put("distanceMm", r.getDistanceMm());
                                item.put("distanceStdDevMm", r.getDistanceStdDevMm());
                                item.put("rssi", r.getRssi());
                                item.put("attempted", r.getNumAttemptedMeasurements());
                                item.put("successful", r.getNumSuccessfulMeasurements());
                            }

                            list.put(item);
                        }

                        JSObject response = new JSObject();
                        response.put("results", list);
                        response.put("timestamp", System.currentTimeMillis());
                        call.resolve(response);
                    }
                }
            );
        } catch (SecurityException error) {
            rttBusy = false;
            call.reject("Wi-Fi RTT permission was denied", "not-allowed");
        } catch (Exception error) {
            rttBusy = false;
            call.reject("Wi-Fi RTT could not start", "rtt-failed");
        }
    }

private Context appContext() {
        return getContext().getApplicationContext();
    }

    private WifiManager wifiManager() {
        return (WifiManager) appContext().getSystemService(Context.WIFI_SERVICE);
    }

    private boolean hasLocation() {
        return getPermissionState("location") == PermissionState.GRANTED;
    }

    private boolean locationEnabled() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            return true;
        }

        LocationManager location =
            (LocationManager) appContext().getSystemService(Context.LOCATION_SERVICE);

        return location != null && location.isLocationEnabled();
    }

    private JSObject buildResults(WifiManager wifi) {
        List<ScanResult> results = wifi.getScanResults();
        JSArray networks = new JSArray();
        long nowUs = SystemClock.elapsedRealtimeNanos() / 1000L;
        long newestAgeMs = Long.MAX_VALUE;

        for (ScanResult result : results) {
            long ageMs = (nowUs - result.timestamp) / 1000L;

            if (result.timestamp <= 0 || ageMs < 0 || ageMs > EDAD_MAXIMA_MS) {
                continue;
            }

            newestAgeMs = Math.min(newestAgeMs, ageMs);

            JSObject item = new JSObject();
            item.put("ssid", result.SSID == null ? "" : result.SSID);
            item.put("bssid", result.BSSID == null ? "" : result.BSSID.toLowerCase(Locale.ROOT));
            item.put("rssi", result.level);
            item.put("frequency", result.frequency);
            item.put("ageMs", ageMs);
            item.put("rtt", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && result.is80211mcResponder());
            networks.put(item);
        }

        JSObject response = new JSObject();
        response.put("networks", networks);
        response.put("timestamp", System.currentTimeMillis());
        response.put("newestAgeMs", newestAgeMs == Long.MAX_VALUE ? -1 : newestAgeMs);
        return response;
    }

    private void resolveCached(PluginCall call, WifiManager wifi, String reason) {
        try {
            JSObject response = buildResults(wifi);
            response.put("fresh", false);
            response.put("reason", reason);
            call.resolve(response);
        } catch (SecurityException error) {
            call.reject("Wi-Fi scan permission was denied", "not-allowed");
        } catch (Exception error) {
            call.reject("Wi-Fi results could not be read", "scan-failed");
        }
    }

    private void publishResults(WifiManager wifi, String cachedReason) {
        try {
            JSObject response = buildResults(wifi);
            response.put("fresh", cachedReason == null);

            if (cachedReason != null) {
                response.put("reason", cachedReason);
            }

            PluginCall call = pendingCall;
            cleanup();

            if (call != null) {
                call.resolve(response);
            }
        } catch (SecurityException error) {
            rejectPending("Wi-Fi scan permission was denied", "not-allowed");
        } catch (Exception error) {
            rejectPending("Wi-Fi results could not be read", "scan-failed");
        }
    }

    private void rejectPending(String message, String code) {
        PluginCall call = pendingCall;
        cleanup();

        if (call != null) {
            call.reject(message, code);
        }
    }

    private void cleanup() {
        pendingCall = null;
        pendingAllowCached = false;

        if (timeout != null) {
            mainHandler.removeCallbacks(timeout);
            timeout = null;
        }

        if (receiver != null) {
            try {
                appContext().unregisterReceiver(receiver);
            } catch (IllegalArgumentException ignored) {
            }

            receiver = null;
        }
    }

    private void unregisterPassive() {
        if (passiveReceiver != null) {
            try {
                appContext().unregisterReceiver(passiveReceiver);
            } catch (IllegalArgumentException ignored) {
            }

            passiveReceiver = null;
        }
    }

    @Override
    protected void handleOnPause() {
        mainHandler.post(() -> rejectPending("Wi-Fi scan was interrupted", "cancelled"));
    }

    @Override
    protected void handleOnDestroy() {
        mainHandler.post(() -> {
            destroyed = true;
            unregisterPassive();
            rejectPending("Wi-Fi plugin was closed", "cancelled");
        });
    }
}
