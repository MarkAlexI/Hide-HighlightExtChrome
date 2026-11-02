# Hide & Highlight 2.0.0

Blur literal words or phrases and highlight other text on supported webpages.
The extension uses plain JavaScript, no runtime dependencies and no telemetry.

## Development

```sh
npm install
npx playwright install chromium
npm run check
npm run build
```

The build creates a store ZIP in `dist/`. It includes only the extension's
runtime files, locale messages, raster icons and license. Tests, developer
instructions, marketing assets, package metadata and build tools are excluded.
Load this source folder as an unpacked extension for development.

`HH_BROWSER_PATH` can select a preinstalled Chromium executable for DOM/UI tests.
The browser and UI suites run production scripts in Chromium with controlled
extension API fixtures; they are not installed-extension tests.

## Behavior

- Separate blur and highlight lists can run together. Blur wins overlaps.
- Terms are literal, separated by semicolons or new lines. Up to 100 terms and
  4,000 characters are accepted per list; processing stops at 5,000 matches.
- Phrase matching can cross inline formatting. It does not join paragraphs,
  explicit line breaks or editable controls.
- Default scope is the current tab and origin, including reloads, until the tab
  closes or the browser session ends. Navigating to another origin does not carry
  its temporary rule across.
- Remember on this site saves an origin-specific rule locally. Unchecking it and
  applying deletes that saved site rule. Pause and Remove effects affect the
  current tab only; Remove effects retains the words and any saved site rule.
- Drafts persist through popup closure, color settings and background restarts
  within the browser session. Last-applied words are also retained locally.
- Ready-made color palettes are in the popup. The native color picker runs only
  in the separate color page, which preserves the original tab when opened from
  the popup.

## Storage and upgrading

Rules, explicitly remembered origins and color preferences are local. Temporary
tab rules and drafts use `storage.session`. No new rules are written to sync.
On first upgrade, old sync words/colors are imported locally and retained as a
local migration backup. Old sync keys are removed after the local commit.
Imported words are offered as a draft; they are not automatically applied to
all pages. Pages open during an extension update should be reloaded before use.

## Scope and limitations

Matching is limited to normal HTTP(S) top-level document text. Browser pages,
PDF viewers, protected sites, images, embedded frames, shadow roots and editable
controls are outside this release's matching scope. Temporary markup is reversed
without replacing page elements or their event listeners; sites that completely
rewrite DOM structures should still be checked before presenting.

Blur changes appearance only. It does not remove text from the webpage or
provide secure redaction. No account, analytics or network service is used.

Firefox retains its extension ID and event-page background model. Its minimum
is desktop 115 / Android 120. Chromium's minimum is 102. The only named API
permission remains `storage`; existing `<all_urls>` content-script matches are
retained.
