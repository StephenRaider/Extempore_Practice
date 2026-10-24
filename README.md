# Extempore Prep

An offline Android app that helps school students prepare for extempore speaking: sharper vocabulary, ready-made phrases, general knowledge across nine domains, annotated sample speeches, timed speaking practice with recording, quizzes and progress tracking.

It is a web app (HTML/CSS/JS, no framework, no network calls) wrapped for Android with [Capacitor](https://capacitorjs.com). All content lives in plain JSON files under `www/data/`, so it is easy to edit and extend.

## Features

| Tile | What it does |
| --- | --- |
| **Today's Tidbit** | One knowledge card per day on the home screen, plus "another tidbit". |
| **Word Upgrade** | 120 sharper alternatives for 20 overused words (good, bad, important, problem, big, show, help, change…), tagged by tone, with example sentences. Flashcard lessons with "Got it" / "Again" and a Leitner spaced-repetition schedule. |
| **Phrase Bank** | 104 phrases in 7 purpose groups (openings, stance, transitions, evidence, both sides, rebuttals, conclusions) and 9 topic-line groups. Tap to copy, heart to favourite. |
| **Knowledge** | 9 domains, 27 topics, 162 cards (fact, landmark example, quote, pros and cons, key idea, extempore angle). Uncertain facts carry a "double-check" flag. |
| **Sample Speeches** | 27 annotated speeches (about 400–450 words, about 3 minutes). Sections labelled hook / stance / point / transition / conclusion, upgrade words tappable for meanings, key phrases highlighted, annotations can be switched off. |
| **Practice Speaking** | Random topic, prep timer, speaking timer with section cues, optional "use 3 upgrade words" challenge, recording and playback, self-rating checklist. Also 1-minute stretch drills and opening, transition and closing drills. |
| **Quiz** | 542 questions (135 knowledge, 240 word-meaning and word-use, 117 fill-in-the-blank, 50 phrase), rounds of 5, quick refresher on the home screen, review queue for mistakes. Weak words and topics come back more often. |
| **My Progress** | Streak, XP, words mastered, quiz history, per-domain progress, weak topics and words, practice stats. |

Everything is offline. Progress is saved on the device (localStorage). Settings has an optional name for "Hi, <name>!", sound toggle, and backup/restore of progress as text.

### Phones and tablets

* Phone: single column, bottom-safe layouts, big tap targets.
* Tablet portrait (≥ 600 px): larger grids.
* Tablet landscape and wide screens (≥ 900 px): navigation rail on the left, **two-pane layouts** (list on the left, detail on the right) in Word Upgrade, Phrase Bank, Knowledge and Sample Speeches, two-column Practice, Quiz and Progress.
* Rotation is supported on every screen; the activity handles configuration changes without restarting.

## Why Capacitor

The brief suggested a Capacitor-wrapped web app or native Kotlin. Capacitor was chosen because the content is mostly text and layout, the JSON data files stay trivially editable, the same UI can be previewed and tested in any browser, and the Android project underneath is a normal Gradle project that Android Studio opens directly.

## Build the APK

Requirements: **Node 22+**, **JDK 17 or newer** (21 recommended) and the **Android SDK** (Android Studio, or command-line tools with platform 36 and build tools; Gradle downloads the rest).

```bash
npm ci
npm run apk
```

`npm run apk` validates the content, syncs the web app into the Android project, runs Gradle, and copies the result to `dist/extempore-prep-debug.apk`. If Gradle cannot find the SDK, set `ANDROID_HOME` (Windows: `setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"`) and open a new terminal.

Install on a device or emulator with `adb install -r dist/extempore-prep-debug.apk`, or copy the file to the tablet and open it (allow "install unknown apps").

Prefer Android Studio? Run `npx cap sync android`, then `npx cap open android` and press Run.

### Build in GitHub instead

`.github/workflows/android-debug-apk.yml` builds the debug APK on every push and pull request. Download it from the run's **Artifacts** section (`extempore-prep-debug-apk`).

## Preview in a browser

```bash
npm run serve        # http://localhost:8080
```

Use your browser's device toolbar to try phone and tablet sizes. The microphone and clipboard work on `localhost`.

## Editing the content

All content is in `www/data/`. After editing run `npm run check` to validate it.

| File | Content |
| --- | --- |
| `domains.json` | The 9 domains and 27 topics, including the prompts used by Practice Speaking. |
| `domains/<domain>.json` | For each domain: `cards`, `speeches` and `quiz` (knowledge questions). |
| `words.json` | Overused words (`groups`) and their `alternatives`. |
| `phrases.json` | Phrase categories. A category with `quizzable: true` is used for phrase quiz questions. |
| `drills.json` | One-word prompts and transition pairs for the drills. |

Speech text markup: `[[word|meaning]]` marks a tappable upgrade word, `{{phrase}}` marks a key phrase. Cards with `"verify": "…"` show a "double-check this figure" note.

## Project layout

```
www/            the app (index.html, css/, js/, data/)
android/        Capacitor Android project (Gradle)
scripts/        serve.mjs, check-data.mjs, build-apk.mjs
.github/        CI workflow
```

## Notes and limits

* The app cannot judge speech quality; recording, playback and the self-rating checklist are the substitute.
* Facts and statistics were written from general knowledge without live sources. Items flagged "double-check" in the app and any figure you plan to quote should be verified.
* The APK is a **debug** build (signed with the debug key). For a Play Store release you would add a release keystore and run `./gradlew bundleRelease`.
