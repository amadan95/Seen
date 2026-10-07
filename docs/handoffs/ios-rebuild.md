# iOS native rebuild — October 6, 2026

Rebuilt the updated app as an unsigned **Release iOS Simulator application** using
Xcode 27.0 (27A266a), iOS 27 simulator SDK, scheme SeenDev and bundle identifier
`com.amadan95.seen.development`. This is a real native build, not just a JS export.
The app contains its current Hermes JavaScript bundle and does not require Metro.

Build artifact: `/private/tmp/seen-ios-rebuild/Build/Products/Release-iphonesimulator/SeenDev.app`.
Successful build log: `/private/tmp/seen-ios-rebuild-final.log`.

The initial build exposed missing Expo SQLite vendored C/header files following the
earlier frozen dependency restoration. Restored `sqlite3.c` and `sqlite3.h` from the
installed expo-sqlite vendor directory to its ios directory, exactly as the existing
ExpoSQLite.podspec generates them. Invalidated only the stale ExpoSQLite PCM files
in this rebuild's own compiler cache. No package versions, source behavior or
lockfile changed. The final build used ONLY_ACTIVE_ARCH=YES for the arm64 simulator
and completed with BUILD SUCCEEDED. CocoaPods/Xcode emit existing upstream warnings.

Installed on the running iPhone 18 Pro simulator (iOS 27), without uninstalling or
resetting its existing local data. Launched successfully; the native Home screen
loaded the existing library and the process remained running. Opened the Tonight
route via the registered app scheme and verified its new controls and recommendations
in the native app; [simulator screenshot](../screenshots/ios-tonight-rebuilt.png). Physical iPhone
installation, signing, archive/TestFlight/App Store submission, full device QA,
VoiceOver and native interruption tests were not performed.

Earlier development handoffs correctly described checks on their dates. This
rebuild supersedes their statement that no native binary compile was performed.
It does not complete the outstanding authentication/backend/release gates.

## Live catalog follow-up

The October 6 [catalog recovery](catalog-connection-recovery.md) replaces the installed
Release app with a Debug development build for live TMDB data. Release builds deliberately
disable the local bridge; the prior statement that Metro was unnecessary described the
sample/cached Release preview only. Live local data requires the bridge and Metro to run.
