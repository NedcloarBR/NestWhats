/**
 * How an adapter identifies itself in a UI.
 *
 * Declared by the adapter so a dashboard can label a client without knowing
 * which platforms exist — the same reason `optionsSchema` lives there.
 */
export interface AdapterPlatform {
	/** Stable machine name, e.g. `whatsapp-web.js`. */
	id: string;
	/** What a person calls it, e.g. `WhatsApp Web`. */
	label: string;
	/**
	 * Inline SVG for a compact badge, sized to a 16×16 viewBox and inheriting
	 * `currentColor`. Prefer a mark for *how it connects* — a browser, a socket,
	 * a cloud — since that is what actually differs between platforms.
	 *
	 * This is markup from your own adapter code, injected as-is; never build it
	 * from user input.
	 */
	icon?: string;
	/** Accent for the badge; falls back to the neutral UI colour. */
	color?: string;
}
