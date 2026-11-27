package expo.modules.motion

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The steps and the runs.
 *
 * - The steps: the step sensor of the phone (TYPE_STEP_COUNTER). It counts all
 *   the time, also when Sidekick is closed. Its value is the number of steps
 *   since the last start of the phone.
 * - The runs: Google's activity recognition. It tells RunReceiver when the
 *   user starts and stops to run, also when Sidekick is closed.
 */
class MotionModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  private val sensors: SensorManager?
    get() = context?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager

  override fun definition() = ModuleDefinition {
    Name("Motion")

    Function("hasStepSensor") {
      sensors?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    }

    /**
     * The value of the step sensor, and the time of the last start of the
     * phone (in ms since 1970). The sensor gives a value soon after we listen
     * to it. If no value comes in 10 seconds, the promise gives null.
     */
    AsyncFunction("readSteps") { promise: Promise ->
      val manager = sensors
      val sensor = manager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (manager == null || sensor == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      val handler = Handler(Looper.getMainLooper())
      var done = false
      lateinit var listener: SensorEventListener
      val finish = { value: Map<String, Any?>? ->
        if (!done) {
          done = true
          manager.unregisterListener(listener)
          promise.resolve(value)
        }
      }
      listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
          val boot = System.currentTimeMillis() - SystemClock.elapsedRealtime()
          handler.post { finish(mapOf("steps" to event.values[0].toDouble(), "boot" to boot.toDouble())) }
        }

        override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
      }
      handler.post {
        manager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
      }
      handler.postDelayed({ finish(null) }, 10_000)
    }

    /**
     * Asks Google's activity recognition to tell RunReceiver when a run
     * starts and stops. The request stops after a restart of the phone. Thus,
     * Sidekick calls this function each time that it saves the steps.
     * The promise gives false if the phone has no Google Play services.
     */
    AsyncFunction("watchRuns") { promise: Promise ->
      val ctx = context
      if (ctx == null ||
        GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(ctx) != ConnectionResult.SUCCESS
      ) {
        promise.resolve(false)
        return@AsyncFunction
      }
      val transitions = listOf(
        ActivityTransition.ACTIVITY_TRANSITION_ENTER,
        ActivityTransition.ACTIVITY_TRANSITION_EXIT,
      ).map {
        ActivityTransition.Builder()
          .setActivityType(DetectedActivity.RUNNING)
          .setActivityTransition(it)
          .build()
      }
      try {
        ActivityRecognition.getClient(ctx)
          .requestActivityTransitionUpdates(ActivityTransitionRequest(transitions), RunReceiver.pendingIntent(ctx))
          .addOnSuccessListener { promise.resolve(true) }
          .addOnFailureListener { promise.resolve(false) }
      } catch (e: SecurityException) {
        // The user removed the permission "Physical activity".
        promise.resolve(false)
      }
    }

    /** The run events since the last call, as JSON: [{"at": ms, "kind": "start" | "end"}]. */
    Function("takeRunEvents") {
      context?.let { RunReceiver.take(it) } ?: "[]"
    }
  }
}
