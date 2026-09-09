/**
 * Ctrl+K / Cmd+K focuses the search box.
 *
 * The local search theme ships no shortcut of its own — Algolia's DocSearch is
 * where that convention comes from — so this binds the same keys people
 * already try, and nothing else.
 */
export function onRouteDidUpdate(): void {
	// Registered once, on the window, rather than per route.
}

if (typeof window !== "undefined") {
	window.addEventListener("keydown", (event: KeyboardEvent) => {
		if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
			return;
		}
		const input = document.querySelector<HTMLInputElement>(
			".navbar input.navbar__search-input",
		);
		if (!input) return;
		event.preventDefault();
		input.focus();
		input.select();
	});
}
