---
name: glass-theme
description: "Activate, inspect, or customize the Glass theme contributed by the Theme Glass plugin."
---

# Glass theme

The Theme Glass plugin contributes one palette, `glass`, to bb's appearance
settings. It is a translucent material theme: chrome surfaces blur a soft mesh
wallpaper behind them, in both light and dark mode.

## Activate

```sh
bb theme set plugin:theme-glass:glass     # activate
bb theme show                             # confirm what is active
bb theme reset                            # back to Default
```

Settings → Appearance lists the same palette as **Glass** under Plugins.

## Where the CSS lives

```
themes/glass.css
```

`package.json` declares it under `bb.themes`; bb reads the file from the
installed plugin directory and injects it into `<style id="bb-app-theme">`.
There is no build step for the CSS: edit the file, then

```sh
bb plugin reload theme-glass
```

## How it works

bb injects theme CSS **unlayered**, while every app utility lives in
`@layer utilities`. An unlayered rule therefore wins at equal specificity, so
the theme restyles `.bg-sidebar`, `.bg-background`, `.bg-popover` and
`.bg-card` directly instead of only swapping custom properties.

Two rules keep the result readable and keep authoring predictable:

1. `--canvas` stays opaque. bb derives `--border`, `--card`, `--popover` and
   many `color-mix()` values from it; a translucent canvas destabilizes every
   hairline and solid surface in the app.
2. Only chrome gets the material — sidebar, main pane, composer, popovers,
   dialogs, cards. Long scrolling content and the terminal stay on solid
   surfaces.

Overlay selectors are written as `div[role="dialog"]` / `div[data-vaul-drawer]`
so they outrank the generic `div.bg-background` pane rule that would otherwise
paint a dialog with pane material.

## Tuning

Every material value is a token declared once per mode at the top of the file:

| token | effect |
| --- | --- |
| `--glass-wallpaper-base`, `--glass-wallpaper-image` | the backdrop behind the app |
| `--glass-sidebar`, `--glass-pane`, `--glass-card` | surface tint and alpha |
| `--glass-header` | thread header band: faint scrim in light, faint tint in dark |
| `--glass-pane-strong` | composer fill |
| `--glass-chip` | disclosure pills and composer chips |
| `--glass-popover`, `--glass-dialog` | overlay tint and alpha |
| `--glass-blur`, `--glass-blur-strong`, `--glass-blur-composer` | filter strength |

**No surface draws a shadow or a border.** The theme zeroes `box-shadow`,
`border-width` and `--tw-ring-shadow` on the sidebar, header, composer, cards,
popovers, dialogs, drawers and the `bg-background/70` pills. Separation comes
from tint alone, so if two surfaces look identical the fix is to change their
alpha, not to add an edge back.

The disclosure pills above the composer ("Committed - N files", the merge-base
picker, attachment chips) are matched with `[class*="bg-background/70"]`. They
are styled with `shadow-xs` plus a 1px `ring`, both of which are edges, so that
rule clears `--tw-ring-shadow` and sets `box-shadow: none`.

The **desktop app** frames the content column as a card. Its classes carry
`before:border-y before:border-r before:border-l before:border-border` plus
`after:w-px after:bg-border`; both substrings occur exactly once in the bundle.

The desktop build's frame is **not** a drop-in substitute for the browser
pane. Measured on the real DOM (the desktop geometry reproduced in the app):

- The frame root carries `bg-sidebar` plus a
  `linear-gradient(var(--surface-recessed), var(--surface-recessed))` overlay.
- The content pane inside it is a `<main>` **without the `bg-background`
  token**; the browser build's equivalent pane has it.
- Because the token is missing, the browser-only rule that makes nested
  `bg-background` surfaces transparent (the composer dock above
  `.chat-prompt-box`, the scroll-to-latest pill) never fires on desktop, and
  those surfaces paint their own pane tint plus a second `blur(26px)` pass.

That is the whole difference: the prompt wrapper's class list and geometry are
identical in both builds, but its surrounding stack is not.

The theme therefore restores the browser build's stack instead of painting one
sheet over the window:

```css
[class*="before:border-border"]::before,
[class*="after:bg-border"]::after {
  border-width: 0;
  background-color: transparent;
  backdrop-filter: none;
}

/* The card's px-px pb-px is the border inset it no longer needs. */
[class*="before:border-border"] {
  padding: 0;
}

[data-framed] {
  --bb-frame-window-lip: 0px !important;
  --bb-frame-card-radius: 0px !important;
  background-color: transparent;
  background-image: linear-gradient(var(--glass-pane), var(--glass-pane));
  background-repeat: no-repeat;
  background-position: top;
  background-size: 100% var(--bb-window-title-bar-height, 0px);
  backdrop-filter: none;
}

[data-framed] > main {
  background-color: var(--glass-pane);
  backdrop-filter: var(--glass-blur);
}

[data-framed] > main [class~="bg-background"] {
  background-color: transparent;
  backdrop-filter: none;
}
```

- The pane paints the material. The frame only paints the title-bar strip,
  because the card's `::before` starts at
  `top: var(--bb-window-title-bar-height)` and the card's own background is
  masked out of that band. Painting the whole frame instead stacks a second
  sheet under the sidebar, right panel, cards and composer dock; those panels
  come out visibly lighter than the browser build. The app's
  `--surface-recessed` gradient must be cleared for the same reason.
- No filter on the frame. It would become a backdrop root for every pane
  inside it; the strip has nothing behind it but the wallpaper.
- The `[data-framed] > main [class~="bg-background"]` rule mirrors the browser's
  `[class~="bg-background"] [class~="bg-background"]` descendant rule. It must
  be structural because the framed pane has no token to match. The composer
  form is unaffected: `form[...]` is later and equally specific, so it keeps
  `--glass-pane-strong` and the composer blur.
- The last rule clears the framed sidebar card's own `border-y border-l`.

Verified by rendering the same thread in web mode and in framed macOS mode at
1280×577 and diffing: pane, composer dock and form resolve to identical
rectangle, tint and filter; the composer region differs by at most 1 luminance
level (blur rounding), in light and dark mode. The title-bar strip only exists
on desktop, and painting it keeps it from showing the raw wallpaper.

The header is **transparent** (`--glass-header: transparent`). It sits inside
the pane that already paints the material, and the thread scroller starts
exactly at its bottom edge — measured, header `0-48`, scroller `48-932` — so
nothing ever passes behind it and no scrim is needed for legibility. Any tint
there draws a band across the top of the pane, which is the seam this removes.

Measured seam, header rows vs pane rows in the same text-free column: dark
`31.4` vs `31.2`, light `243.2` vs `243.5` — under half a luminance level in
both modes. If you need the band back for some layout where content does pass
behind the header, set `--glass-header` to a tint and keep this rule intact.

The composer does need its filter: the thread scroller runs underneath it, so
`--glass-blur-composer` (`blur(48px)`) is what turns message text passing behind
the pill into a soft wash. It has its own blur token so tuning it never changes
popovers and dialogs.

## Selector shape

Always match surface utilities as **whole class tokens**, never element-qualified:

```css
[class~="bg-sidebar"] { ... }        /* correct */
div.bg-sidebar       { ... }        /* silently skips <aside>, <section>, <form> */
```

bb puts these utilities on `main`, `form`, `section`, `aside`, `button` and
`span`. The right panel is an `<aside class="... bg-sidebar ...">`, so
`div.bg-sidebar` left it opaque and unfiltered while the app sidebar was glass —
the two panes looked like different themes.

`~=` (not `*=`) matters: it matches a whole class token, so `bg-sidebar` cannot
catch `bg-sidebar-accent` or a `--sidebar-border` custom property.

## Framed desktop parity

The framed window must resolve to the *same* surfaces as the browser build, and
that only works if the desktop pane paints what the browser pane paints. The
desktop build drops the pane's `bg-background` token, so the theme matches the
pane structurally (`[data-framed] > main`) and then applies the same descendant
rule the browser build gets from that token. The frame itself is reduced to the
title-bar strip; painting the whole frame makes every nested surface stack a
second tint and come out lighter.

Verified by rendering the same thread in web mode and framed macOS mode at
1280×577 and diffing the regions: pane, composer dock and form all resolve to
identical rectangles, tints and filters; the composer band differs by at most
1 luminance level, light and dark. The prompt wrapper's own class list and
geometry are identical in both builds — the difference was always the stack
above it.

## Plugin surfaces

A plugin paints its own chrome from `var(--canvas)`, usually as an **inline**
declaration:

```html
<div style="background: var(--canvas); border-color: color-mix(in oklch, var(--ink) 16%, var(--canvas));">
```

Inline styles beat every class selector, so patching `.bg-background` and
friends does nothing for plugin panels — that is why they stay flat while the
app goes glass.

The fix is at the token, not the selector: `--canvas` is translucent in the
theme. Everything derived from it (`--background`, `--card`, `--popover`, the
`color-mix` border colours) becomes translucent too, which is what the look
wants anyway. One attribute rule then supplies the filter:

```css
[style*="background: var(--canvas)"],
[style*="background-color: var(--canvas)"] {
  backdrop-filter: var(--glass-blur);
}
```

The substring match is what makes this safe: it only hits elements whose inline
style actually declares that background, not ones that merely reference the
token for a border colour.

Verified on the Finder plugin page: 25 surfaces pick up `blur(26px)
saturate(1.6)`, and the only opaque surfaces left in the app are the wallpaper
body and solid primary buttons.

## Scroll overflow fades

bb marks a scrollable region's overflow with a 24px gradient that fades to the
surface colour. The component emits
`data-overflow-fade="above|below"` plus `data-overflow-fade-tone`, with three
tone classes:

```
background     -> bg-gradient-to-b from-transparent to-background
sidebar        -> ... to-sidebar
surface-raised -> ... to-surface-raised-solid
```

The gradient is opaque at one end (`rgb(11, 13, 19)`), and no glass surface
matches that colour, so its edge reads as a soft dark band — a shadow with no
shadow. It is cleared by attribute, which covers every tone and placement:

```css
[data-overflow-fade] {
  background-image: none;
}
```

The element stays in the DOM and keeps `pointer-events-none`, so scroll state,
layout and hit testing are unaffected. The rule is scoped by the attribute: a
normal element carrying the same gradient utility still paints, which is how
you verify it did not over-reach.

## Legibility budget

Two values trade off, and both are easy to get wrong:

- **The dark wallpaper base** is `#12141c`, not near-black. Every chrome surface
  is translucent, so the base shows through between and behind them. With a
  `#07080d` base those gaps read as black smudges even though nothing draws a
  shadow — the theme's shadow tokens are all `none` and an audit of the live DOM
  finds zero `box-shadow` values. Raising the base moved the darkest 5% of the
  window from luminance 15.9 to 21.5.
- **The composer** needs enough alpha to stay legible. At 52-58% the message
  text behind it showed through and overlapped the input text. At 90%/86% with
  `blur(48px)` the interior is provably opaque to content: scroll the
  conversation, diff the composer's empty area, and the mean delta and standard
  deviation are both `0.00`.

If you lower `--glass-pane-strong` to make the composer glassier, verify with
that scroll-diff check — a bleed is invisible in a static screenshot.

## Split panes

The line between chat and editor is drawn twice, so removing one source still
leaves a line:

```css
[class*="cursor-col-resize"][class*="w-px"],
[class*="cursor-row-resize"][class*="h-px"] {
  background-color: transparent;
}

[class~="border-r"][class~="border-border"] {
  border-right-width: 0;
}

[class*="bg-sidebar"][class*="border-l border-border"],
[class*="bg-sidebar"][class*="border-l border-border-seam"] {
  border-left-width: 0;
}
```

- The splitter element is a 1px `bg-border` / `bg-border-seam` div. Its resize
  hit target is a separate transparent 12px sibling that shares the
  `cursor-col-resize` class, so the cursor selector alone would be too broad —
  matching `w-px` as well keeps the target and drops only the line.
- The chat column closes with `border-r border-border` on its own container,
  and the editor/tool panels open with `border-l border-border`. Neither is the
  splitter element, so the line survives unless those are cleared too.
- `~=` matches a whole class token, so `border-ring` and `--border` custom
  properties cannot be caught by accident.
- Content borders stay: markdown blockquotes (`border-l border-border-seam
  pl-3`), code blocks (`border border-border`) and table cells.

Raising a surface's alpha raises contrast and hides more wallpaper; lowering it
shows more color. Keep body text at or above a 4.5:1 contrast ratio against the
worst-case wallpaper stop in that mode.

`--glass-solid` is the single fallback color used when the browser lacks
`backdrop-filter` or the user has `prefers-reduced-transparency: reduce`.
