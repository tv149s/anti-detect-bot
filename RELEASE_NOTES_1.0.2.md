# Human Simulator 1.0.2 Release Notes

Release date: 2026-06-24

## Summary

Human Simulator 1.0.2 stabilizes website profile handling, restores pure trajectory portability, and improves long-running replay behavior when pages stop loading new content.

## Changes

- Removed the persistent Target URL input from the main window.
- Step 1 now opens an in-app URL dialog only for initializing or updating a website login profile.
- Recording files remain pure trajectory files and do not store website URLs or profile metadata.
- Replay and Auto Play now use the selected website profile to reopen the saved profile start URL.
- Added profile URL mapping in `profile-url-map.json` so login profiles can reopen their correct websites without coupling URLs to trajectory JSON files.
- Fixed the old `profile_urls.json` metadata file being displayed as a fake `urls.json` profile by filtering profile entries to directories only and migrating the legacy metadata file.
- Restored Facebook/X wheel playback behavior by removing DOM `WheelEvent`, `scrollBy`, and recorded `scroll` replay side effects.
- Added TikTok-specific wheel handling that converts accumulated wheel gestures into `ArrowDown` / `ArrowUp` navigation, because TikTok ignores normal wheel playback in this context.
- Added 30-second stale-content detection during Replay and Auto Play. If wheel/navigation playback does not produce content growth, the current page reloads and playback continues.
- Stale-content detection uses growth metrics such as page height, DOM node count, text length, media count, URL, and title, while ignoring scroll-position jitter.
- Hardened replay shutdown handling so closed pages or contexts do not surface as fatal replay errors.
- Kept the Windows IME/GPU input-freeze mitigation from the working test build.

## Validation Notes

Validated locally with syntax checks and manual app restarts during testing. The final working behavior was confirmed after user testing showed the 30-second stale-content reload mechanism firing correctly.

## Important Behavior

- Step 1 URL is only for login/profile initialization.
- Recording, Replay, and Auto Play do not read the old URL input and do not store URLs in trajectory JSON.
- Auto Play keeps looping until its configured duration ends, reloading stale pages when needed.
- Single Replay runs the selected JSON through to completion, reloading stale pages only when the 30-second detection finds no content growth.
