# Sidekick

A small app to record the small exercises that you do during the day.

You make a card for each exercise. During the day, you push a card, set the reps or the time held, and save. The app keeps the totals and shows your progress compared to your own past.

The plan is in [design/plan.md](design/plan.md).

## Start the app

Sidekick uses a development build. This is a version of Sidekick for development, with its own Android code (`modules/motion`, for the steps and the runs). Expo Go does not contain this code.

### One time: install the development build

1. Run `npm run build:dev`. EAS builds the APK on its servers. The free plan can put the build in a queue for a long time.
2. Open the link from EAS on the phone and download the APK.
3. Install the APK. If Android asks, allow "Install unknown apps" for the browser.

Make a new development build only when you add or change a native module, or change `app.json`.

### Each day: send the changes to the phone

```sh
npm start          # then open Sidekick (development build) on the phone and scan the QR code
npm run tunnel     # use this if the phone cannot connect to the computer
npm run go         # Expo Go: all pages work, but the steps and the runs do not show
```

The phone shows each change in the code immediately.

### An APK without the computer

`npm run build:apk` makes an APK that works without the computer. Do not use the `production` profile for the phone: it makes an `.aab` file, and a phone cannot install an `.aab` file.

## Steps and runs

**Steps.** Sidekick counts the steps itself, with the step sensor of the phone. It starts to count when the user pushes "Count my steps and runs" on the Totals page and gives the permission "Physical activity". Sidekick has no steps from before that moment.

The sensor counts all the time, also when Sidekick is closed. Sidekick saves the value of the sensor when it opens, and in the background approximately every 15 minutes. The steps between two saved values are the difference. A restart of the phone sets the sensor to 0, so Sidekick can lose the steps of the last minutes before a restart.

The Android code is in `modules/motion`.

**Runs.** Sidekick uses the activity recognition of Google Play services. It tells the Android code when the user starts and stops to run, also when Sidekick is closed. The Android code keeps these events until Sidekick saves them in the database. The same permission ("Physical activity") is necessary. Runs shorter than 2 minutes do not count.

Sidekick does not use Health Connect.
