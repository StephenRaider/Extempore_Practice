# Extempore Prep

An offline Android app that helps school students prepare for extempore speaking: sharper vocabulary, ready-made phrases, general knowledge across nine domains, annotated sample speeches, timed speaking practice with recording, quizzes and progress tracking.

It is a web app (HTML/CSS/JS, no framework, no network calls) wrapped for Android with [Capacitor](https://capacitorjs.com). All content lives in plain JSON files under `www/data/`, so it is easy to edit and extend.

## Features

The home screen has five big buttons and a small Library link, so you can open the app and start in one tap.

| Button | What it does |
| --- | --- |
| **Knowledge** | A random topic: 5 short flashcards, then 5 quick questions on them. 126 cards on storytelling, vivid description, imagining the future, feelings, speaking about yourself, big ideas, noticing everyday life, delivery and fun things to mention. |
| **Vocabulary** | 5 cards that say "Instead of x, use y". Type y once, tap the card to flip it and see y in an example, then 5 fill-in-the-blank questions. 120 words. |
| **Phrases** | The same flow for phrases from the Phrase Bank (104 phrases), then 5 questions. |
| **Quiz** | Starts a 5-question revision round straight away from cards, words and phrases you have already studied. Questions answered correctly 3 times in a row become rare but still return; a miss brings them back more often. |
| **Speak** | A random creative topic ("My life 50 years from now", "A day without speaking anything"; 140 prompts in 7 types, plus optional current-affairs topics), prep timer (default 1 minute, adjustable) and 3-minute speech, with recording and self-rating. |
| **Library** | Names-only menu: all knowledge cards by topic, word groups, Phrase Bank, 27 sample speeches, quiz by topic, progress, tidbit and settings. |

The look is pastel pink and white with a soft pink flamingo mascot; emoji are tinted pink.

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
| `knowledge.json`, `flash.json` | Knowledge topics and their short flashcards (`qs` with the correct option first). Used by Knowledge and the quiz. |
| `topics.json` | Creative speaking prompts for Practice, grouped in types. |
| `domains/<domain>.json` | Longer reading cards and sample `speeches` (shown in the Library). |
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
