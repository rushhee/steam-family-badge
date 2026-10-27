# Steam Family Share Badge

A Chrome extension that marks Steam store search results with an **In Steam Family Library** badge when the game is available to you through your Steam Family, so you don't have to open each listing to find out.

- Uses your existing Steam login in Chrome; no API key or setup.
- Skips games you own yourself (Steam already shows those as "In Library").
- Caches the shared library for 6 hours. Click the extension icon to refresh it sooner.

## Install

1. Download the zip for your OS from [Releases](../../releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped `steam-family-badge` folder.
4. Log in to the Steam store and search. Shared games get the badge.

## Notes

Shared games are read from Steam's `IFamilyGroupsService` web API, which is undocumented and may change. It only works in Chrome, not the Steam client.
