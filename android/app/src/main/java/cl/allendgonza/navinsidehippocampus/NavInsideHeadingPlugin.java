package cl.allendgonza.navinsidehippocampus;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Surface;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NavInsideHeading")
public class NavInsideHeadingPlugin
    extends Plugin
    implements SensorEventListener {

    private final Handler mainHandler =
        new Handler(Looper.getMainLooper());

    private SensorManager manager;
    private Sensor activeSensor;
    private String session;
    private long lastEmissionMs;
    private boolean destroyed;

    @PluginMethod
    public void start(PluginCall call) {
        mainHandler.post(() -> {
            if (destroyed) {
                call.reject(
                    "Heading plugin is closed",
                    "unavailable"
                );
                return;
            }

            stopInternal();

            manager = (SensorManager)
                getContext().getSystemService(
                    Context.SENSOR_SERVICE
                );

            Sensor sensor = manager == null
                ? null
                : manager.getDefaultSensor(
                    Sensor.TYPE_ROTATION_VECTOR
                );

            if (sensor == null && manager != null) {
                sensor = manager.getDefaultSensor(
                    Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR
                );
            }

            if (sensor == null) {
                call.reject(
                    "Absolute heading is unavailable",
                    "unavailable"
                );
                return;
            }

            activeSensor = sensor;
            session = call.getString(
                "session",
                "default"
            );
            lastEmissionMs = 0;

            if (
                !manager.registerListener(
                    this,
                    sensor,
                    SensorManager.SENSOR_DELAY_GAME,
                    mainHandler
                )
            ) {
                stopInternal();

                call.reject(
                    "Heading sensor could not start",
                    "unavailable"
                );
                return;
            }

            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        mainHandler.post(() -> {
            if (
                session != null &&
                session.equals(
                    call.getString(
                        "session",
                        "default"
                    )
                )
            ) {
                stopInternal();
            }

            call.resolve();
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onSensorChanged(
        SensorEvent event
    ) {
        long now = SystemClock.elapsedRealtime();

        if (
            session == null ||
            destroyed ||
            event.accuracy <=
                SensorManager.SENSOR_STATUS_ACCURACY_LOW ||
            now - lastEmissionMs < 150L
        ) {
            return;
        }

        float[] matrix = new float[9];
        float[] adjusted = new float[9];
        float[] orientation = new float[3];

        SensorManager.getRotationMatrixFromVector(
            matrix,
            event.values
        );

        int rotation = getActivity()
            .getWindowManager()
            .getDefaultDisplay()
            .getRotation();

        int x = SensorManager.AXIS_X;
        int y = SensorManager.AXIS_Y;

        if (rotation == Surface.ROTATION_90) {
            x = SensorManager.AXIS_Y;
            y = SensorManager.AXIS_MINUS_X;
        } else if (
            rotation == Surface.ROTATION_180
        ) {
            x = SensorManager.AXIS_MINUS_X;
            y = SensorManager.AXIS_MINUS_Y;
        } else if (
            rotation == Surface.ROTATION_270
        ) {
            x = SensorManager.AXIS_MINUS_Y;
            y = SensorManager.AXIS_X;
        }

        if (
            !SensorManager.remapCoordinateSystem(
                matrix,
                x,
                y,
                adjusted
            )
        ) {
            return;
        }

        SensorManager.getOrientation(
            adjusted,
            orientation
        );

        double degrees = (
            Math.toDegrees(orientation[0]) +
            360.0
        ) % 360.0;

        if (
            Double.isNaN(degrees) ||
            Double.isInfinite(degrees)
        ) {
            return;
        }

        lastEmissionMs = now;

        JSObject reading = new JSObject();

        reading.put(
            "degrees",
            degrees
        );

        reading.put(
            "session",
            session
        );

        notifyListeners(
            "heading",
            reading
        );
    }

    @Override
    public void onAccuracyChanged(
        Sensor sensor,
        int accuracy
    ) {
    }

    private void stopInternal() {
        session = null;
        activeSensor = null;

        if (manager != null) {
            manager.unregisterListener(this);
        }
    }

    @Override
    protected void handleOnPause() {
        mainHandler.post(() -> {
            if (manager != null) {
                manager.unregisterListener(this);
            }
        });
    }

    @Override
    protected void handleOnResume() {
        mainHandler.post(() -> {
            if (
                !destroyed &&
                session != null &&
                manager != null &&
                activeSensor != null
            ) {
                manager.registerListener(
                    this,
                    activeSensor,
                    SensorManager.SENSOR_DELAY_GAME,
                    mainHandler
                );
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        mainHandler.post(() -> {
            destroyed = true;
            stopInternal();
        });
    }
}