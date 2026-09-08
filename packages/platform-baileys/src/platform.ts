import type { AdapterPlatform } from "nestwhats";

/**
 * How this adapter presents itself in a UI.
 *
 * The Baileys project publishes its mark only as PNG (`Media/logo.png` and
 * `Media/icon.png` in the repository), and the badge contract wants inline
 * SVG that inherits `currentColor`; embedding a raster would be neither. The
 * icon is therefore left out and the dashboard falls back to a lettered
 * badge, tinted with the teal of the mark's gradient — read off the logo, not
 * a colour of this package's own.
 */
export const BAILEYS_PLATFORM: AdapterPlatform = {
	id: "baileys",
	label: "Baileys",
	color: "#22C9B6",
};
