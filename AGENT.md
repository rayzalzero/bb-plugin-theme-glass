# bb-plugin-theme-glass

An Apple-style translucent glass theme for [bb](https://getbb.app). Chrome
surfaces (sidebar, main pane, composer, popovers, dialogs, cards) become
frosted sheets over a soft mesh wallpaper, in light and dark mode.

- Plugin id: `theme-glass`
- Palette id: `glass` (activate as `plugin:theme-glass:glass`)
- Repo: https://github.com/rayzalzero/bb-plugin-theme-glass
- Engines: `bb >= 0.47`, `@get-bb/plugin-sdk >= 0.6.79`

## Structure

- `package.json` — manifest. `bb.server` → `./server.ts`; `bb.skills` → `skills`; `bb.themes` declares the `glass` palette pointing at `./themes/glass.css`.
- `server.ts` — headless backend entry. Logs once, holds no state; the theme CSS is served by bb itself and re-read on every appearance change.
- `themes/glass.css` — the entire palette. All material values are tokens at the top; no build step.
- `skills/glass-theme/SKILL.md` — detailed usage, tuning, and parity-verification reference for agents.
- `dist/` — generated build output (gitignored).

## Commands

```sh
npm install
bb plugin install . --yes
bb plugin build                 # or: bb plugin dev  (watch + reload)
bb plugin reload theme-glass    # reload after a CSS edit — no build needed
bb theme set plugin:theme-glass:glass
bb theme reset
bb plugin logs theme-glass
```

## Core invariants — do not violate

1. **`--canvas` stays OPAQUE.** bb derives `--border`, `--card`, `--popover`,
   `--surface-recessed-solid` and dozens of `color-mix()` values from it; a
   translucent canvas destabilizes every hairline and solid surface.
2. **Only chrome gets the material** — sidebar, main pane, composer, popovers,
   dialogs, cards. Long scrolling content and the terminal stay on solid
   surfaces.
3. **Match surfaces as whole class tokens**, never element-qualified:
   `[class~="bg-sidebar"]` (correct), `div.bg-sidebar` (wrong — silently skips
   the `<aside>` right panel). `~=` (not `*=`) matches whole tokens only.
4. **No surface draws a shadow or a border.** Separation comes from tint alone;
   if two surfaces look identical, change the alpha, don't add an edge back.
5. **Desktop framed window resolves to the same surfaces as the browser build.**
   Match structurally (`[data-framed] > main`), don't paint the whole frame —
   that stacks a second tint on every nested panel.

## CSS mechanics

- bb injects this file unlayered into `<style id="bb-app-theme">`; app
  utilities live in `@layer utilities`, so an unlayered rule wins at equal
  specificity. That's why the theme restyles `.bg-sidebar` / `.bg-background`
  / `.bg-popover` / `.bg-card` directly instead of only swapping custom props.
- Tokens are declared once per mode at the top of the file, under `:root,
  .light` and `.dark`: `--glass-wallpaper-base`, `--glass-wallpaper-image`,
  `--glass-sidebar`, `--glass-pane`, `--glass-pane-strong`, `--glass-popover`,
  `--glass-dialog`, `--glass-card`, `--glass-header`, `--glass-chip`,
  `--glass-blur`, `--glass-blur-strong`, `--glass-blur-composer`,
  `--glass-solid`.
- `--glass-solid` is the single fallback color used when `backdrop-filter` is
  unsupported or the user has `prefers-reduced-transparency: reduce`.
- Plugin panels: `--canvas` is made translucent and the filter is supplied by
  an attribute rule, because plugins paint via inline
  `background: var(--canvas)` which beats class selectors.
- Scroll-overflow fades are cleared by `[data-overflow-fade] { background-image:
  none; }`; the element stays in the DOM, so scroll state and hit testing are
  untouched.

## Verification

- After a CSS edit: `bb plugin reload theme-glass`, then confirm visually in
  web mode and framed macOS mode at 1280×577 — pane, composer dock and form
  must resolve to identical rectangles/tints/filters (see SKILL.md for the
  diff procedure).
- Composer legibility: scroll the conversation, diff the composer's empty
  interior; mean delta and std dev must be `0.00`.
- Body text ≥ 4.5:1 contrast against the worst wallpaper stop in each mode.
