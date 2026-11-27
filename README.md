# Sidekick

A small app to record the small exercises that you do during the day.

You make a card for each exercise. During the day, you push a card, set the reps or the time held, and save. The app keeps the totals and shows your progress compared to your own past.

The plan is in [design/plan.md](design/plan.md).

## Start the app

Sidekick uses a development build. This is a version of Sidekick for development, with all the native modules (for example, Health Connect). Expo Go does not contain Health Connect.

### One time: install the development build

1. Run `npm run build:dev`. EAS builds the APK on its servers. The free plan can put the build in a queue for a long time.
2. Open the link from EAS on the phone and download the APK.
3. Install the APK. If Android asks, allow "Install unknown apps" for the browser.

Make a new development build only when you add or change a native module, or change `app.json`.

### Each day: send the changes to the phone

```sh
npm start          # then open Sidekick (development build) on the phone and scan the QR code
npm run tunnel     # use this if the phone cannot connect to the computer
npm run go         # Expo Go: all pages work, but the steps do not show
```

The phone shows each change in the code immediately.

### An APK without the computer

`npm run build:apk` makes an APK that works without the computer. Do not use the `production` profile for the phone: it makes an `.aab` file, and a phone cannot install an `.aab` file.

## Steps and runs

Sidekick reads the steps and the runs from Health Connect. Health Connect is the store for health data on Android. Sidekick only reads the data. The data does not leave the phone.

- Android 14 and newer: Health Connect is part of Android.
- Android 13 and older: install Health Connect from the Play Store.

Health Connect gets the steps from the phone or from an app, for example Samsung Health, Google Fit, or Fitbit. If the steps stay at 0, open Health Connect and make sure that one app sends the steps.

Sidekick shows a run only when another app or a watch records it as a run in Health Connect.
