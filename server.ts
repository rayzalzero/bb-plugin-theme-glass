// bb-plugin-theme-glass — headless backend entry.
//
// The plugin contributes its palette through `bb.themes` in package.json, so
// this entry only needs to exist and load. Keep it free of state: the theme
// is served from themes/glass.css by bb itself, and re-read on every
// appearance change.
import type { BbPluginApi } from "@get-bb/plugin-sdk";

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("glass theme available as plugin:theme-glass:glass");
}
