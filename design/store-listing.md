# Play Store listing

This file contains all the text that the Play Console asks for. Copy and paste it. The procedure is in section 1.

Date: 27 November 2026.

---

## 1. Procedure

Do the steps in this sequence.

1. **Publish the privacy policy.** Done. The page is at `https://vivekabarneaud.github.io/sidekick-privacy/`. Its source is the repository `vivekabarneaud/sidekick-privacy`. If you change `design/privacy-policy.html`, copy it to that repository as `index.html`.
2. **Make the app in the Play Console.** Use the values in section 2.
3. **Make a release build.** Run `npx eas-cli build --profile production --platform android`. This makes an `.aab` file.
4. **Upload the `.aab` file to "Internal testing".**
5. **Fill in "App content".** Use sections 4 to 8.
6. **Send the release for review.**

Sidekick does not use Health Connect. Thus, there is no Health Connect declaration and no wait for it.

---

## 2. App details

| Field | Value |
|---|---|
| App name | `Sidekick` |
| Package name | `com.viveka.sidekick` |
| Category | Health & Fitness |
| Tags | Fitness, Exercise |
| Free or paid | Free |
| Contains ads | No |
| In-app purchases | No |
| Email | `viveka.barneaud@gmail.com` (the same as Peckish) |
| Privacy policy | `https://vivekabarneaud.github.io/sidekick-privacy/` |
| Website | *(empty)* |

## 3. Descriptions

### Short description

*Maximum 80 characters. This text has 76.*

```
Log small exercises in seconds. See your progress. Data stays on your phone.
```

### Full description

*Maximum 4000 characters.*

```
Sidekick is for the days when a full workout is not possible. You do a few
small exercises during the day: some wall push-ups, a short plank, ten calf
raises. Sidekick records each one in about three seconds and shows how much
you did.

ONE CARD FOR EACH EXERCISE
Make a card for each exercise that you do. Push the card, set the reps or the
time held, and save. Usually, the last values are already correct, so you only
push "Save". A library of gentle exercises fills in the name and the measure
for you.

YOUR TOTALS AND YOUR PROGRESS
Sidekick shows your totals for today, this week, and all time. It shows your
best results and a chart of each week. It compares this week only with your
own past, never with other people.

A KIND APP
There are no streaks that break. There are no red numbers. There are no
"you missed a day" messages. Each small exercise counts.

STEPS AND RUNS
If you want, Sidekick counts your steps and finds your runs, also when the app
is closed. You can give or remove this permission at any time.

YOUR DATA STAYS ON YOUR PHONE
No account. No sign-in. No server. No advertising. No tracking.
```

---

## 4. Data safety

- **Does your app collect or share any of the required user data types?** No.
- Data collected: none.
- Data shared: none.
- Data encrypted in transit: not applicable. Sidekick sends no data.
- Can users ask for the deletion of their data? Not applicable. Sidekick keeps data only on the phone.

**Why "No" is correct, also with the steps and the runs.** Play defines "collect" as "send data off the device". Sidekick records the steps and the runs, shows them on the phone, and sends them nowhere. Thus, Sidekick does not collect them. The privacy policy explains the use of the Health Connect data in detail, because the Health Connect rules require it.

**Android's own backup.** The privacy policy also explains this backup. This data goes to the Google account of the user, not to us. Thus, it does not change the answers.

## 5. Content rating questionnaire

Answer "No" to all questions. Sidekick has no violence, no sexual content, no bad language, no drugs, and no gambling. It has no communication between users, no location sharing, and it collects no personal information. The result is "suitable for all ages".

## 6. App access

All the functions are available without restriction. There is no login.

## 7. Target audience

Sidekick is not for children. Select 18 and over, or 13 and over.

---

## 8. Health apps declaration

If the Play Console asks if Sidekick is a health app, answer: fitness. Sidekick records small exercises, the steps, and the runs, and shows the progress of the user. Sidekick does not use Health Connect.

The permission "Physical activity" (`ACTIVITY_RECOGNITION`) does not need a special declaration. The privacy policy explains its use.

---

## 9. Assets

| Item | File | Size |
|---|---|---|
| App icon | **to do** | 512 × 512 |
| Feature graphic | **to do** | 1024 × 500 |
| Phone screenshots | **to do**: take them on the phone | 2 to 8, minimum 320 px on the short side |

Sidekick does not have an icon yet. For the screenshots, show the grid of cards with the log panel open, the Totals page with a chart, and the steps section.
