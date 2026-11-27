# Sidekick — plan for the first version

Status: sections 1 to 7 are built. Section 8 is the plan for the next versions.
Date: 18 November 2026. Section 8 updated on 27 November 2026.

## 1. The problem

The user has very low physical strength. Full workouts are not possible. Thus, the user does small exercises during the day. Two problems occur:

- It is difficult to remember all the exercises that the user did.
- The user becomes discouraged easily.

Sidekick records each small exercise in a few seconds. It then shows the totals and the progress over time.

## 2. Rules for the design

These rules apply to all parts of the app.

1. **Logging is fast.** One log takes approximately 3 seconds.
2. **The app is kind.** The app never punishes the user.
   - No streaks that break.
   - No red numbers and no "you missed a day" messages.
   - A lost fight costs nothing (see section 8.8).
3. **The user competes only with their past.** The app never compares the user to other people or to "normal" values. (A leaderboard is possible later, but only as an option. See section 8.10.)
4. **The data stays on the phone.** No account and no server.

## 3. Platform and technology

The app uses the same technology as Peckish:

- Expo and React Native, with TypeScript.
- Expo Router for the pages.
- expo-sqlite for the data.
- expo-image-picker and expo-image for the custom images.
- react-native-svg for the glyphs and the charts. (This is new. Peckish does not use it.)

The first version is only for the Android phone of the user.

## 4. Pages in the first version

### 4.1 The fast log page

The app opens on this page.

- The page shows a grid of the exercise cards.
- The most recent cards are at the top.
- The user pushes a card. A panel opens at the bottom of the screen.
- The panel shows the input for the measure type of the card (see section 5).
- The panel starts with the last values for this card. Usually, the user only pushes "Save".
- After "Save", a short message shows "Saved" with an "Undo" button.
- A "+" button opens the card page.

### 4.2 The card page

The user makes a new card or changes a card on this page.

1. The user types a name.
2. While the user types, the app shows suggestions from the library (see section 6).
3. If the user selects a suggestion, the app fills the name, the measure type, and the glyph.
4. The user selects the measure type.
5. The user selects an image:
   - the glyph from the library,
   - a photo from the camera or from the gallery,
   - or no image. Then the card shows the first letter of the name on a color.

The user can also hide a card. The app keeps the logs of a hidden card. The app does not delete logs.

### 4.3 The totals page

This page shows the totals and the progress.

- **Totals for all exercises:** today, this week, and all time.
- **Active days:** the number of days with one or more logs in this month.
- **For each exercise:**
  - the totals (today, this week, all time),
  - the best result (for example: "Longest hold: 34 s, 12 March"),
  - a chart of the weekly totals.
- **Comparison:** the app compares "Monday until now" with the same days and hours 4 weeks ago. The current week is not finished, so a comparison with a full week is not fair. When the number is lower, the app shows the two numbers in a neutral color, never in red.

The charts show weekly totals for the last 8 weeks, as columns. A weekly total already makes the line smooth. Thus, one bad day does not look like a big drop. The user pushes a column to see its value.

### 4.4 Steps and runs

The totals page starts with a card for the steps and the runs.

- The user pushes "Count my steps and runs" and gives the permission "Physical activity". Sidekick starts to count at this moment. It has no steps from before, the same as for the exercises.
- **Steps.** The step sensor of the phone counts all the time. Sidekick saves the value of the sensor when it opens, and in the background approximately every 15 minutes. The steps between two saved values are the difference.
- **Runs.** Google's activity recognition tells Sidekick when the user starts and stops to run, also when Sidekick is closed. Runs shorter than 2 minutes do not count.
- The card shows the steps today, the steps this week, a chart of the steps for each of the last 8 weeks, and the runs of this week.
- Sidekick does not use Health Connect. Thus, Sidekick needs no other app, and the Play Store needs no Health Connect declaration.

## 5. Measure types

Each card has one measure type.

| Measure type | The user enters | Example |
|---|---|---|
| Reps | the number of reps | 8 wall push-ups |
| Time held | the number of seconds | plank on the knees, 20 s |
| Reps and time held | the number of reps and the seconds for each rep | 5 bridges, hold 3 s each |

For the type "reps and time held", the app calculates the total time held as reps × seconds.

### 5.1 Two settings for the input

We do not know yet which input is the best. Thus, two settings change the panel. They do not change the data. The user can change them at any time, and the old logs stay correct.

| Setting | Values | Default |
|---|---|---|
| Hold input | "seconds for each rep" or "total seconds" | seconds for each rep |
| Sets | on or off | off |

- **Hold input.** The database always keeps the total seconds. With "seconds for each rep", the app calculates the total as reps × seconds before it saves the log.
- **Sets.** When this setting is off, the panel does not show the "sets" field, and each log has 1 set. When it is on, the user can log "3 × 8" in one action. One "Undo" removes the full log.

The settings are global in the first version. If necessary, we can make them settings of each card later.

## 6. The library

The library is a file in the app: `assets/library.json`. The app does not change this file.

Each entry has these fields:

```json
{
  "key": "wall-push-up",
  "name": "Wall push-up",
  "measure": "reps",
  "glyph": "wall-push-up",
  "tags": ["arms", "chest"]
}
```

The first library has approximately 15 gentle exercises. For example:

- wall push-up
- sit-to-stand from a chair
- seated leg lift
- glute bridge
- wall sit
- plank on the knees
- calf raise (with a hand on a chair)
- standing march
- shoulder blade squeeze
- chin tuck
- bird dog
- dead bug
- arm circles
- heel slides
- side leg lift (on the floor)

The glyphs are simple SVG drawings. We make them. Thus, there is no license problem. In the first version, the glyphs can be empty. The cards then use the first letter of the name.

## 7. Data

The app keeps the data in one SQLite database.

```sql
CREATE TABLE exercises (
  id          INTEGER PRIMARY KEY NOT NULL,
  name        TEXT NOT NULL,
  measure     TEXT NOT NULL,      -- 'reps' | 'time' | 'reps_time'
  library_key TEXT,               -- NULL for a custom exercise
  image_kind  TEXT NOT NULL,      -- 'glyph' | 'photo' | 'none'
  image_uri   TEXT,               -- the photo file, for 'photo' only
  color       TEXT NOT NULL,      -- for the card without an image
  hidden      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE logs (
  id          INTEGER PRIMARY KEY NOT NULL,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  sets        INTEGER NOT NULL DEFAULT 1,
  reps        INTEGER,            -- for each set; NULL for 'time'
  seconds     INTEGER,            -- total held in each set; NULL for 'reps'
  logged_at   INTEGER NOT NULL
);

CREATE INDEX idx_logs_exercise_time ON logs(exercise_id, logged_at);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

```sql
CREATE TABLE step_samples (
  id      INTEGER PRIMARY KEY NOT NULL,
  at      INTEGER NOT NULL,       -- when Sidekick read the sensor
  counter INTEGER NOT NULL,       -- the steps since the last start of the phone
  boot    INTEGER NOT NULL        -- the time of the last start of the phone
);

CREATE TABLE run_events (
  id   INTEGER PRIMARY KEY NOT NULL,
  at   INTEGER NOT NULL,
  kind TEXT NOT NULL              -- 'start' | 'end'
);
```

The samples and the run events are the main data for the steps and the runs, the same as the logs for the exercises. The app calculates all the totals from them.

The totals for one log are:

- reps: sets × reps
- seconds held: sets × seconds

The log is the main object. The app calculates all totals, charts, and (later) the XP from the logs. The app does not keep the totals in the database.

## 8. Later versions

These parts are not in the first version.

### 8.1 Backup (built on 27 November 2026)

- All the data goes into one JSON file: exercises, logs, settings, step samples, and run events. There are no photos, so the file is small.
- **Automatic backup.** The user selects a folder one time (for example, "Documents/Sidekick"). Sidekick writes a new file there when the app goes to the background and from the background task, but only if the data changed. It keeps the newest file of each of the last 3 days with a backup. It never writes over a file, so a stopped write cannot destroy a good backup.
- **The question.** After the first log, Sidekick asks one time for a folder. It never asks again. The settings page (the gear on the Totals tab) has the backup at all times. It shows the folder, the time of the last backup, and a problem if the last backup did not work.
- **Restore.** The user selects a backup file. Sidekick adds only the data that is not already there. It never deletes or replaces data.
- **Google Drive.** The Google Drive app does not let other apps select its folders. Thus, the folder is on the phone. Android's own backup (to the Google account of the user) also includes the database of Sidekick.

### 8.2 Glyphs for the library

Draw one SVG glyph for each exercise in the library. Use one simple style for all glyphs.

### 8.3 The hero and the pet

- The user is a hero. The pet trains with the hero and becomes stronger with the hero.
- The story is short: "In this world, heroes train with their pets. Each exercise makes you both stronger."
- At the start, the user selects one pet from 3 creatures: a kitty, a small dragon, and a puppy. The user gives it a name.
- The pets are our own creatures. Do not copy Pokémon.
- The pet changes its look at some ranks: one drawing for E and D, one for C and B, one for A and S. Thus, each creature needs 3 drawings at the start.
- The pet never becomes sad or sick. It is always very happy to see the user.
- The pet is also the mascot of the app. The app icon shows one of the creatures.

### 8.4 XP and ranks

**The XP is a fixed amount for each action.** It is the same for all users. Thus, the user can calculate it.

| Action | XP |
|---|---|
| 1 rep | 1 XP × the value of the exercise |
| 1 second held | 0.5 XP × the value of the exercise |
| 1 rep with a hold | (1 XP + 0.5 XP for each second) × the value of the exercise |
| 100 steps | 1 XP |
| 1 minute of running | 3 XP |
| A new best result for an exercise | 10 XP bonus |

- **The value of an exercise.** Each entry in the library has a field `xp`, for example 1.5 for a push-up and 0.5 for arm circles. A custom exercise has the value 1. Add the field to `assets/library.json` (default 1).
- **The balance.** Watch that the steps do not give much more XP than the exercises. Example: 5,000 steps give 50 XP, and 30 wall push-ups give 45 XP. Change the numbers if the balance is wrong.
- **Calculation.** The app calculates the XP from the logs, the step samples, and the run events. The database does not keep the XP. Thus, the XP also includes the data from before this version, and a change of a number in the table changes all the XP correctly.

**Ranks.** The ranks go from E to S. Do not copy names, characters, or art from Solo Leveling. These are the first values. Change them after some weeks of use.

| Rank | Total XP | Approximate time to reach it, with 150 XP each day |
|---|---|---|
| E | 0 | at the start |
| D | 1,500 | 2 weeks |
| C | 6,000 | 6 weeks |
| B | 15,000 | 3 months |
| A | 35,000 | 8 months |
| S | 70,000 | 15 months |

**Levels.** The levels show the progress inside a rank. Level n starts at 50 × n² XP. Thus, level 5 starts at 1,250 XP, and level 37 starts at approximately 70,000 XP.

### 8.5 Walk events and the journal

This idea comes from the Pokéwalker: small invented stories occur while the user walks.

- **When.** An event occurs approximately every 1,000 steps (a random number from 700 to 1,300). A run gives a bigger event at its end.
- **When the user sees them.** The steps arrive in samples (see section 4.4). Thus, the app makes the events when it opens, for the steps since the last event. A maximum of 10 events for each day keeps the journal easy to read.
- **The text.** The events are text in `assets/events.json`. Each event has a rank, a text, and an optional reward. The text can use the name of the pet. The app selects an event at random from the events of the current rank.
- **The size grows with the rank.** Examples:
  - E: "You and Mochi helped a grandmother to cross the street."
  - D: "A cyclist lost his phone. Mochi ran after him and gave it back."
  - C: "You and Mochi found a lost dog and took it home."
  - B: "A storm hit the market. You and Mochi helped to save the stalls."
  - A: "The bridge to the next town broke. You and Mochi guided all the people to the old road."
  - S: "A dragon attacked the village. Mochi talked with it, and now it protects the village."
- **The journal.** A page shows all the events, newest first. It is the story of the hero and the pet.

### 8.6 Gold and cosmetics

- **Gold.** The pet finds gold in some events (more gold at higher ranks). Quests and a new rank also give gold.
- **The shop.** The user buys cosmetic items with gold:
  - colors for the pet,
  - accessories for the pet, for example a bowtie or a hat,
  - color themes for the app.
- **Rules.**
  - The user never loses gold.
  - The items are only cosmetic. They give no XP and no power.
  - The prices are low. A normal user buys a small item after approximately one week.

### 8.7 Quests

- A quest is a small story with a target, for example: "Walk 2,000 steps with Mochi to bring a letter to the next town."
- The targets can be steps, runs, or exercises.
- The size of the target comes from the usual days of the user (the average of the last 14 days). Thus, a quest is always possible.
- A quest has no end date and no penalty. The user can have 1 or 2 quests at the same time.
- At the end, the quest gives XP and gold, and an event in the journal.

### 8.8 Fights

**Fights in the story.** Some events and quests have a fight against an invented monster. The power of the pet comes from its level. The pet can lose.

**The shadow of the past.** The pet fights a "shadow" of itself from 4 weeks ago.

- The power of the pet: the XP of the last 7 days.
- The power of the shadow: the XP of the same 7 days, 4 weeks ago.
- A small random part (approximately 10%) makes each fight different.
- The fight is a short animation with some turns. The app shows the result after the animation.
- The user can start one shadow fight each day.

**A lost fight costs nothing.** The pet loses no gold and no XP. It gets a small amount of XP for the effort. The pet is never sad after a fight.

### 8.9 Paid cosmetic items (last)

The user can also buy a cosmetic item for real money, for example 1 €, if they do not have enough gold.

- Each paid item is also available with gold. Money only makes it faster.
- Only cosmetic items. No XP, no power, no advantage in fights.
- No item with a random content ("loot box"). The user always sees what they buy.
- No pressure: no offers for a limited time, and no messages that ask the user to buy.
- **The work.** The purchases must use Google Play Billing. Google takes 15% of each sale. The Play Console needs a payments profile. The privacy policy and the data safety answers must say that Google handles the payments.

### 8.10 Leaderboard (not now)

A leaderboard and fights against the pets of other people are possible later, as an option. The user who does not want it never sees it.

It is not in the plan now, because it needs:

- a server, which must run and be paid for all the time,
- a change of the rule "the data stays on the phone", of the privacy policy, and of the data safety answers,
- a protection against fake steps,
- a check of the pet names for rude words.

Design the fights so that a server can add the pets of other people later without a big change. For example, a fight uses only the name, the creature, the level, and the power of a pet.

### 8.11 The sequence

1. The pet, the XP, and the ranks (sections 8.3 and 8.4).
2. The walk events and the journal (section 8.5).
3. Gold and cosmetics (section 8.6).
4. Quests and fights (sections 8.7 and 8.8).
5. Paid cosmetic items (section 8.9).
6. If still wanted: the leaderboard (section 8.10).

The backup (section 8.1) is built.

### 8.12 A widget on the home screen

The user logs an exercise without opening the app.

## 9. Decisions

1. The hold input and the sets are settings (see section 5.1). The user will select the best values while they use the app.
2. The week starts on Monday.
3. The XP is a fixed amount for each action, the same for all users (see section 8.4). Decided on 27 November 2026.
4. The pet can lose a fight. A lost fight costs nothing (see section 8.8).
5. Paid cosmetic items are possible, but only as the last step, and each item is also available with gold (see section 8.9).
6. No leaderboard for now (see section 8.10).
7. Sidekick counts the steps and finds the runs itself. It does not use Health Connect (see section 4.4).
