package expo.modules.motion

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * Google's activity recognition sends the start and the end of each run
 * here, also when Sidekick is closed. The JavaScript code can be stopped at
 * this time. Thus, the receiver keeps the events in SharedPreferences. The
 * JavaScript code takes them later with takeRunEvents() and saves them in
 * the database.
 */
class RunReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (!ActivityTransitionResult.hasResult(intent)) return
    val result = ActivityTransitionResult.extractResult(intent) ?: return
    val now = System.currentTimeMillis()
    val sinceBoot = SystemClock.elapsedRealtime()
    val events = result.transitionEvents
      .filter { it.activityType == DetectedActivity.RUNNING }
      .map {
        JSONObject()
          .put("at", now - (sinceBoot - it.elapsedRealTimeNanos / 1_000_000))
          .put("kind", if (it.transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER) "start" else "end")
      }
    if (events.isNotEmpty()) add(context, events)
  }

  companion object {
    private const val PREFS = "sidekick_runs"
    private const val KEY = "events"
    private val lock = Any()

    fun pendingIntent(context: Context): PendingIntent {
      val intent = Intent(context, RunReceiver::class.java)
      // Android 12 and newer: the intent must be mutable, because Google Play services adds the events to it.
      val mutable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
      return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or mutable)
    }

    private fun add(context: Context, events: List<JSONObject>) = synchronized(lock) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val list = JSONArray(prefs.getString(KEY, "[]"))
      events.forEach { list.put(it) }
      prefs.edit().putString(KEY, list.toString()).commit()
    }

    fun take(context: Context): String = synchronized(lock) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val value = prefs.getString(KEY, "[]") ?: "[]"
      prefs.edit().remove(KEY).commit()
      value
    }
  }
}
