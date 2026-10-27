# Builds dist/steam-family-badge.user.js for Tampermonkey / Violentmonkey from the extension sources.
# background.js and content.js are wrapped unchanged; a small shim stands in for the chrome.* APIs
# (storage -> GM_getValue/GM_setValue, messaging -> direct calls, API fetches -> GM_xmlhttpRequest).
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$read = { param($name) [IO.File]::ReadAllText((Join-Path $root $name)) }
$manifest = & $read 'manifest.json' | ConvertFrom-Json
$repo = 'https://github.com/rushhee/steam-family-badge'
$download = "$repo/releases/latest/download/steam-family-badge.user.js"
$css = (& $read 'content.css') | ConvertTo-Json

$script = @"
// ==UserScript==
// @name         $($manifest.name)
// @namespace    $repo
// @version      $($manifest.version)
// @description  $($manifest.description)
// @homepageURL  $repo
// @supportURL   $repo/issues
// @downloadURL  $download
// @updateURL    $download
// @match        https://store.steampowered.com/*
// @connect      api.steampowered.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  GM_addStyle($css);

  const storage = {
    get: async (key) => ({ [key]: GM_getValue(key) }),
    set: async (items) => Object.entries(items).forEach(([k, v]) => GM_setValue(k, v)),
    remove: async (key) => GM_deleteValue(key),
  };

  // Cross-origin calls to api.steampowered.com go through the userscript manager.
  const gmFetch = (url) =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        onload: (r) =>
          resolve({
            ok: r.status >= 200 && r.status < 300,
            status: r.status,
            json: async () => JSON.parse(r.responseText),
          }),
        onerror: () => reject(new Error('Network error')),
      });
    });

  let backgroundListener = null;
  let contentListener = null;

  const backgroundChrome = {
    storage: { local: storage },
    runtime: { onMessage: { addListener: (fn) => (backgroundListener = fn) } },
  };
  const contentChrome = {
    runtime: {
      sendMessage: (msg) => new Promise((resolve) => backgroundListener(msg, {}, resolve)),
      onMessage: { addListener: (fn) => (contentListener = fn) },
    },
  };

  // ---- background.js ----
  ((chrome, fetch) => {
$(& $read 'background.js')
  })(backgroundChrome, gmFetch);

  // ---- content.js ----
  ((chrome) => {
$(& $read 'content.js')
  })(contentChrome);

  // Menu commands replace the extension popup.
  GM_registerMenuCommand('Show family library status', async () => {
    const data = await contentChrome.runtime.sendMessage({ type: 'getStatus' });
    if (!data) alert('No data yet. Reload the page while logged in to Steam.');
    else if (data.noFamily) alert('Your account is not in a Steam Family.');
    else alert(data.appids.length + ' shared games. Updated ' + new Date(data.fetchedAt).toLocaleString() + '.');
  });
  GM_registerMenuCommand('Refresh family library', () => contentListener({ type: 'refresh' }));
})();
"@

$out = Join-Path $root 'dist\steam-family-badge.user.js'
New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
[IO.File]::WriteAllText($out, $script.Replace("`r`n", "`n"), (New-Object Text.UTF8Encoding $false))
Write-Host "Built $out"
