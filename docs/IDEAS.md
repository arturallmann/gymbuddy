# Ideas

These ideas may get built later. They are not planned. Do not build them unless `docs/ROADMAP.md` lists them as a task.

## Smart watch support

The phone stays the source of truth. The watch acts as a remote control and a sensor.
The watch never holds its own database, only a short queue for messages it could not send yet.

### Levels

| Level | What it adds | Watch code needed |
|---|---|---|
| 0 | Rest timer alerts through phone notifications (`@capacitor/local-notifications`) | None |
| 1 | Heart rate per workout, read from Apple Health or Health Connect | None |
| 2 | Live heart rate from Bluetooth heart rate broadcast (straps, some watches) | None |
| 3 | Timers, quick set input and live heart rate on the wrist | Native watch apps |

### Native watch apps (level 3)

| Platform | Brands | Language | Phone link |
|---|---|---|---|
| watchOS | Apple Watch | Swift (SwiftUI) | WatchConnectivity |
| Wear OS | Samsung, Google Pixel Watch, others | Kotlin (Compose for Wear OS) | Wearable Data Layer API |
| Connect IQ | Garmin | Monkey C | Connect IQ Mobile SDK via Garmin Connect |

Each platform needs a small custom Capacitor plugin on the phone. The plugin passes watch messages to TypeScript.

### Message contract

All watch apps use the same messages. Every message carries a UUID. The phone ignores a UUID it already saved.

| Message | Direction | Content |
|---|---|---|
| `workoutState` | Phone → watch | Current exercise, last set, next set target |
| `logSet` | Watch → phone | Reps, weight, duration, distance, notes |
| `startTimer` | Either way | Timer length in seconds |
| `heartRate` | Watch → phone | BPM samples with timestamps |

### Schema addition

A `heart_rate_samples` table: `id`, `workoutId`, `recordedAt`, `bpm`, `source`
(`healthkit`, `health-connect`, `bluetooth`, `watch-app`). Average and maximum heart rate are derived at query time.

### Keep the path open now

- Keep workout rules (next set, next exercise) in plain functions in `src/lib/`.
- Keep one active-workout state module on the phone. Screen taps and watch messages both change it.
