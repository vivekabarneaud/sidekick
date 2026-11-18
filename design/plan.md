# Sidekick — plan for the first version

Status: plan only. Nothing is built.
Date: 18 November 2026.

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
3. **The user competes only with their past.** The app never compares the user to other people or to "normal" values.
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

The totals for one log are:

- reps: sets × reps
- seconds held: sets × seconds

The log is the main object. The app calculates all totals, charts, and (later) the XP from the logs. The app does not keep the totals in the database.

## 8. Later versions

These parts are not in the first version.

### 8.1 Backup

Use the backup code from Peckish again. Read `peckish/design/automatic-backup.md` before this step. This step has high priority after the first version, because the logs are the history of the user.

### 8.2 Glyphs for the library

Draw one SVG glyph for each exercise in the library. Use one simple style for all glyphs.

### 8.3 The hero and the pet

- The user is a hero. The pet trains with the hero and becomes stronger with the hero.
- At the start, the user selects a pet: for example, a cute one or a badass one.
- The pets are our own creatures. Do not copy Pokémon.
- The pet never becomes sad or sick. It is always very happy to see the user.
- The story is short. For example: "In this world, heroes train with their pets. Each exercise makes you both stronger."

### 8.4 XP and ranks

- The app calculates the XP from the logs. Thus, the XP also includes the logs from before this version.
- The app gives more XP when the user does better than their own past results.
- Ranks go from E to S. Do not copy names, characters, or art from Solo Leveling.

### 8.5 A widget on the home screen

The user logs an exercise without opening the app.

## 9. Decisions

1. The hold input and the sets are settings (see section 5.1). The user will select the best values while they use the app.
2. The week starts on Monday.
