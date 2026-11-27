const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

/**
 * Health Connect shows a link to the privacy policy on its permission page.
 * Google requires that this link shows the privacy policy of the app.
 *
 * The plugin of react-native-health-connect sends this link to MainActivity.
 * Then the link only opens Sidekick on the first page. This plugin sends the
 * link to a small activity. The activity opens the privacy policy in the
 * browser and then closes.
 *
 * In app.json, put this plugin before "react-native-health-connect". Expo
 * applies the changes to the manifest in the reverse sequence. Thus, this
 * plugin then changes the result of the other plugin.
 */

const URL = 'https://vivekabarneaud.github.io/sidekick-privacy/';
const ACTIVITY = '.PrivacyPolicyActivity';
const RATIONALE = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const ALIAS = 'ViewPermissionUsageActivity';

const hasAction = (filter, name) => (filter.action || []).some((a) => a.$['android:name'] === name);

function withManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);

    // Android 13 and older: Health Connect sends the RATIONALE action.
    main['intent-filter'] = (main['intent-filter'] || []).filter((f) => !hasAction(f, RATIONALE));
    app.activity = (app.activity || []).filter((a) => a.$['android:name'] !== ACTIVITY);
    app.activity.push({
      $: {
        'android:name': ACTIVITY,
        'android:exported': 'true',
        'android:theme': '@android:style/Theme.NoDisplay',
      },
      'intent-filter': [{ action: [{ $: { 'android:name': RATIONALE } }] }],
    });

    // Android 14 and newer: Health Connect opens the activity alias.
    for (const alias of app['activity-alias'] || []) {
      if (alias.$['android:name'] === ALIAS) alias.$['android:targetActivity'] = ACTIVITY;
    }
    return config;
  });
}

function withActivityFile(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const pkg = config.android.package;
      const dir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java', ...pkg.split('.'));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'PrivacyPolicyActivity.kt'),
        `package ${pkg}

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/** Opens the privacy policy in the browser, then closes. Made by plugins/withPrivacyPolicy.js. */
class PrivacyPolicyActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    try {
      startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${URL}")))
    } catch (e: Exception) {
      // The phone has no browser. Nothing to show.
    }
    finish()
  }
}
`,
      );
      return config;
    },
  ]);
}

module.exports = (config) => withActivityFile(withManifest(config));
