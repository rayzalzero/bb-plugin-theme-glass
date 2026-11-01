# Theme Glass

An Apple-style translucent glass theme for [bb](https://getbb.app). Sidebar,
main pane, composer, popovers, dialogs and cards become frosted sheets over a
soft mesh wallpaper, in light and dark mode.

## Install

```sh
git clone <this repo> bb-plugin-theme-glass
cd bb-plugin-theme-glass
npm install
bb plugin install . --yes
bb theme set plugin:theme-glass:glass
```

Or activate it from **Settings → Appearance → Plugins → Glass**.

Revert any time with `bb theme reset`.

## What it changes

| Surface | Treatment |
| --- | --- |
| App background | Soft mesh wallpaper over a mid-dark base (not near-black) |
| Sidebar and right panel | 52% / 56% tint, `blur(26px) saturate(180%)` |
| Main pane | 58% / 60% tint, `blur(26px) saturate(180%)` |
| Thread header | fully transparent — no band, no seam |
| Composer | 90% / 86% tint, `blur(48px)` — legible, no content bleed |
| Popovers and menus | 80% / 86% tint, `blur(38px)` |
| Dialogs and drawers | 84% / 90% tint, `blur(38px)` |
| Disclosure pills | chip tint, `blur` from the parent |
| Cards | 64% / 62% tint, no extra filter pass |
| Split panes | no divider line; the 12px drag target still works |

All surface rules are written as **token selectors** (`[class~="bg-sidebar"]`)
rather than `div.bg-sidebar`. The same utility lands on `main`, `form`,
`section`, `aside`, `button` and `span`, so an element-qualified selector
silently skips whole panels — the right panel is an `<aside>` and stayed opaque
and unfiltered until this was corrected.

Plugin panels follow the theme too. A plugin paints its own chrome as an inline
`background: var(--canvas)` — inline styles beat any class selector — so the
theme makes `--canvas` itself translucent instead of patching panel classes.
Everything the app derives from it (`--background`, `--card`, `--popover`, the
`color-mix` borders) turns translucent with it. A single attribute rule then
adds the filter to those surfaces:

```css
[style*="background: var(--canvas)"],
[style*="background-color: var(--canvas)"] {
  backdrop-filter: var(--glass-blur);
}
```

Measured on the Finder plugin page: 25 surfaces pick up `blur(26px)
saturate(1.6)`; the only opaque surfaces left in the whole app are the wallpaper
body and solid primary buttons.

bb also marks scroll overflow with a 24px gradient that fades to the surface
colour (`data-overflow-fade`: tones `background`, `sidebar`, `surface-raised`).
That gradient is opaque at one end — `rgb(11, 13, 19)` — so on a translucent
surface its edge never matches, and the mismatch reads as a soft dark band.
The theme clears `background-image` on those elements; they stay in the DOM, so
scroll state and hit testing are untouched.

**Nothing draws a shadow or a border.** No drop shadows, no inset rims, no 1px
outlines, no `ring` on the pills above the composer. Every surface is a tinted
sheet of blurred wallpaper, and the tint difference is the only thing that
separates one surface from the next.

That includes the **desktop app's framed window**. There the content column is
a card: `::before` carries a 4-side border plus an opaque fill that starts
*below* the title bar, and `::after` draws a hairline in that bar. Both layers
go empty, and the card's 1px border inset is zeroed.

The pane is then repainted the way the browser build paints it. The desktop
build drops the pane's `bg-background` token and leans on the frame, which is
`bg-sidebar` plus a `--surface-recessed` gradient — that left the composer dock
(and the scroll pill) painting their own pane sheet and a second blur pass.
The theme matches the framed pane structurally, clears those descendants the
same way the browser's token does, and limits the frame itself to the
title-bar strip that no pane covers.

Verified by rendering the same thread in web mode and framed macOS mode at
1280×577 and diffing: pane, composer dock and form resolve to identical
rectangles, tints and filters; the composer band differs by at most 1 luminance
level, light and dark.

The 8px window lip and the corner radius are zeroed, and the framed sidebar
card's own `border-y border-l` is cleared.

The dark base is `#12141c` rather than near-black on purpose. Every chrome
surface is translucent, so the base is what shows between and behind them; a
`#07080d` base made those gaps read as black smudges and shadows even though
nothing drew a shadow. Raising it moved the darkest 5% of the window from
luminance 15.9 to 21.5 while the cards stayed put.

The composer sits at 90% (light) / 86% (dark) with `blur(48px)`. Measured by
scrolling the conversation behind it and diffing the composer interior: mean
delta `0.00`, standard deviation `0.00` — no content reaches the surface, so a
long message can never overlap the input text.

Split panes are borderless too. The divider between chat and editor is drawn
twice by bb: as a 1px `bg-border` / `bg-border-seam` element (`w-px
cursor-col-resize`), and as `border-r border-border` on the chat column itself.
The thread-detail divider (thread | right panel) adds a third shape: a sibling
line span (`left-full w-px`) next to the cleared handle, also `bg-border` /
`bg-border-seam`. All are cleared while the invisible 12px hit target is
untouched, so resizing still works. Only chrome is matched — markdown
blockquotes, code blocks and table cells keep their borders.

## Requirements

`backdrop-filter` (Chrome 76+, Safari 9+ with prefix, Firefox 103+). Without it
the theme falls back to a flat solid palette. Users with
`prefers-reduced-transparency: reduce` get the same fallback automatically.

## Customizing

All material values are tokens at the top of `themes/glass.css`, one block per
mode. Edit, then `bb plugin reload theme-glass` — no build step for CSS.

See [skills/glass-theme/SKILL.md](skills/glass-theme/SKILL.md) for the token
table and the layering rule that makes the overrides work.

## Structure

```
package.json        manifest; bb.themes declares the palette
server.ts           headless backend entry (loads, logs, does nothing else)
themes/glass.css    the palette
skills/glass-theme/ agent-facing usage and tuning notes
```
