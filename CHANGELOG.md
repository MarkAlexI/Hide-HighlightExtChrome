# Changelog

## 2.0.0

- Apply blur and highlighting together using independent word lists.
- Add current-tab scope, explicit remembered site rules, pause and reversible
  removal of effects while keeping entered words.
- Match literal text, whole words and case-sensitive terms, including phrases
  crossing inline formatting.
- Restore rules on reload, ignore empty terms, replace previous effects cleanly
  and respond to dynamically updated page text.
- Preserve original page styles, text node references and element listeners.
- Add a compact accessible popup, light/dark themes, match counts, ready-made
  palettes and a separate custom color page with a live preview.
- Preserve drafts across popup closure and color settings; recover tab state
  after background restarts during the browser session.
- Migrate existing words and colors to local settings and stop using sync for
  new rules. Old words are retained as a draft for explicit application.
- Complete all 26 existing locales and shorten localized store summaries.
- Refresh icons and correct Firefox compatibility metadata.

Reload pages that were already open during the update before applying effects.
