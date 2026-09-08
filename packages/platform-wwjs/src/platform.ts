import type { AdapterPlatform } from "nestwhats";

/**
 * The whatsapp-web.js project logo, from github.com/wwebjs/Assets — its own
 * mark, not WhatsApp's. It says which library is behind a client, which is the
 * thing that differs: every adapter here talks to WhatsApp, so the WhatsApp
 * logo would make them all look alike.
 *
 * Trimmed from the official SVG for inlining at badge size: the drop-shadow
 * filter is gone along with the white copy of the bubble that existed only to
 * compose it — kept without its filter, that copy paints over everything under
 * it — and the remaining id is namespaced, since several of these share a page
 * and bare ids like "a" would collide.
 *
 * The repo ships the monochrome variant; the bubble is repainted in the green
 * the project uses everywhere else (#25d366, sampled from wwebjs.dev), so the
 * badge matches the logo people recognise.
 */
const WWEBJS_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024"><g id="wwjs-d"><path d="M3896.9-5869.959l78.284-234.848A508.539,508.539,0,0,1,3896.73-6377c0-282.215,228.783-511,511-511s511,228.781,511,511-228.783,511-511,511a508.622,508.622,0,0,1-272.177-78.438L3900.7-5866.159a3.026,3.026,0,0,1-.964.159,3,3,0,0,1-2.432-1.253,3,3,0,0,1-.4-2.707Z" transform="translate(-3895.729 6889)" fill="#fafafa" /><g data-type="innerShadowGroup"><path d="M4064.335-6124.78,3949.1-6086.364a2.5,2.5,0,0,1-2.557-.6,2.5,2.5,0,0,1-.6-2.557l38.354-115.056A423.144,423.144,0,0,1,3896.73-6463c0-234.721,190.28-425,425-425s425,190.28,425,425-190.279,425-425,425A423.08,423.08,0,0,1,4064.335-6124.78Z" transform="translate(-3809.729 6975)" fill="#25d366" /></g><path d="M419.472,559.9H101.724a69.941,69.941,0,0,1-70-70V398.929H15a15,15,0,0,1-15-15V257.623a15,15,0,0,1,15-15H31.725V163.317a69.941,69.941,0,0,1,70-70H201.988c.027,0,2.806-.411,6.287-1.276a42.626,42.626,0,0,0,11.064-4.178A19.462,19.462,0,0,0,225.79,81.4a16.161,16.161,0,0,0,1.674-3.56,43.255,43.255,0,0,1-5.018-6.443,45.4,45.4,0,0,1-3.844-7.484,46.094,46.094,0,0,1-3.326-17.255,45.586,45.586,0,0,1,3.74-18.162,46.463,46.463,0,0,1,10.2-14.831,47.491,47.491,0,0,1,15.127-10,48.623,48.623,0,0,1,37.047,0,47.493,47.493,0,0,1,15.126,10,46.463,46.463,0,0,1,10.2,14.831,45.586,45.586,0,0,1,3.74,18.162,46.362,46.362,0,0,1-12.466,31.484,19.034,19.034,0,0,0,1.91,3.438,22.174,22.174,0,0,0,6.493,6.283c6.033,3.745,15.938,5.437,16.037,5.454h97.045a69.942,69.942,0,0,1,70,70v79.306h18.991a15,15,0,0,1,15,15V383.928a15,15,0,0,1-15,15H489.472V489.9a69.942,69.942,0,0,1-70,70ZM188.124,411.057a22.868,22.868,0,0,0,0,45.735H335.338a22.868,22.868,0,0,0,0-45.735ZM163.734,238.28a38.113,38.113,0,1,0,38.082,38.112A38.141,38.141,0,0,0,163.734,238.28Zm198.026,0a38.112,38.112,0,1,0,38.082,38.112A38.14,38.14,0,0,0,361.76,238.28Z" transform="translate(250.269 232.05)" fill="#fff" /></g></svg>`;

/**
 * How this adapter presents itself in a UI: the whatsapp-web.js name and mark,
 * so a dashboard showing several clients can say which library is behind each.
 */
export const WWEBJS_PLATFORM: AdapterPlatform = {
	id: "whatsapp-web.js",
	label: "WhatsApp Web.js",
	icon: WWEBJS_LOGO,
	color: "#25D366",
};
