import { getKnownCapabilities } from "nestwhats";
import { NESTWHATS_LOGO } from "./dashboard.constants.js";
import type { RegisteredAdapterInfo } from "./dashboard-options.interface.js";

/**
 * Builds the dashboard page: one self-contained HTML document with its own CSS
 * and script, so the server has nothing to serve besides this string.
 *
 * @param token - action token the page must send back with every mutation.
 * @param hasWebhook - whether to render the webhook binding controls.
 * @param hasClientManager - whether virtual clients can be created and removed.
 * @param adapters - what the create form offers, and the option fields each
 * adapter declares.
 */
export function getDashboardHtml(
	token: string,
	hasWebhook: boolean,
	hasClientManager: boolean,
	adapters: RegisteredAdapterInfo[] = [],
): string {
	return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NestWhats · Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #060912;
      --surface:   #0c1022;
      --surface2:  #111728;
      --surface3:  #171f36;
      --border:    #1c2442;
      --border2:   #26304e;
      --text:      #dde4f4;
      --text2:     #8a97b8;
      --muted:     #4d5a7a;

      --green:        #22c78b;
      --green-glow:   rgba(34,199,139,.14);
      --orange:       #f59e0b;
      --orange-glow:  rgba(245,158,11,.14);
      --red:          #f06060;
      --red-glow:     rgba(240,96,96,.14);
      --blue:         #5b8af0;
      --blue-glow:    rgba(91,138,240,.14);
      --teal:         #2ad4bf;
      --teal-glow:    rgba(42,212,191,.14);

      /* One accent per state: live, needs you, down. Idle stays uncoloured. */
      --live:      #2ad4bf;
      --wants-you: #f59e0b;
      --down:      #f06060;
      --idle:      #4d5a7a;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      background-image: radial-gradient(circle, #18213a 1px, transparent 1px);
      background-size: 26px 26px;
      color: var(--text);
      font-family: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
    }

    /* ── Shell ── */
    .shell {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    /* ── Header ── */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 2.25rem;
      flex-wrap: wrap;
    }

    .brand { display: flex; align-items: center; gap: .9rem; }

    .brand-logo {
      width: 42px; height: 42px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .brand-logo svg { width: 100%; height: 100%; display: block; }

    .brand-name {
      font-size: 1.2rem; font-weight: 700;
      color: #fff; letter-spacing: -.02em; line-height: 1.1;
    }

    .brand-sub {
      font-size: .78rem; color: var(--muted);
      margin-top: .15rem;
    }

    .header-actions { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }

    .refresh-btn {
      display: flex; align-items: center; gap: .4rem;
      background: var(--surface2);
      border: 1px solid var(--border2);
      border-radius: 8px;
      color: var(--text2);
      cursor: pointer;
      padding: .4rem .85rem;
      font-size: .75rem; font-family: inherit; font-weight: 500;
      transition: border-color .15s, color .15s;
      white-space: nowrap;
    }
    .refresh-btn:hover { border-color: var(--teal); color: var(--teal); }
    .refresh-btn:active { transform: scale(.97); }

    .live-badge {
      display: flex; align-items: center; gap: .5rem;
      background: var(--surface2);
      border: 1px solid var(--border2);
      border-radius: 100px;
      padding: .35rem .9rem;
      font-size: .72rem; font-weight: 500; color: var(--text2);
      white-space: nowrap;
    }

    .ripple-dot {
      --dot-color: var(--green);
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--dot-color); flex-shrink: 0;
      position: relative;
    }
    .ripple-dot::after {
      content: '';
      position: absolute;
      inset: -4px; border-radius: 50%;
      background: var(--dot-color); opacity: 0;
      animation: ripple 2.2s ease-out infinite;
    }
    .ripple-dot.offline { --dot-color: var(--red); }
    @keyframes ripple {
      0%   { transform: scale(.5); opacity: .5; }
      100% { transform: scale(2.8); opacity: 0; }
    }

    /* ── Stats bar ── */
    .stats-bar {
      display: flex; gap: .75rem;
      margin-bottom: 2rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    .stats-bar::-webkit-scrollbar { display: none; }

    .stat-card {
      flex-shrink: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: .9rem 1.25rem;
      min-width: 115px;
      position: relative;
      overflow: hidden;
    }
    .stat-card::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
    }
    .stat-total::after  { background: var(--blue); }
    .stat-ready::after  { background: var(--green); }
    .stat-auth::after   { background: var(--teal); }
    .stat-qr::after     { background: var(--orange); }
    .stat-disc::after   { background: var(--red); }

    .stat-n {
      font-size: 2rem; font-weight: 700;
      line-height: 1; margin-bottom: .3rem;
    }
    .stat-total .stat-n { color: var(--blue); }
    .stat-ready .stat-n { color: var(--green); }
    .stat-auth  .stat-n { color: var(--teal); }
    .stat-qr    .stat-n { color: var(--orange); }
    .stat-disc  .stat-n { color: var(--red); }

    .stat-l {
      font-size: .75rem; font-weight: 400;
      color: var(--muted);
    }

    /* ── Grid ── */
    .grid {
      align-items: start;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    /* ── Card — animation only on .card-entering ── */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex; flex-direction: column; gap: .9rem;
      position: relative; overflow: hidden;
      transition: border-color .2s, box-shadow .25s, transform .2s;
      cursor: default;
    }
    .card-entering {
      animation: slide-up .35s ease both;
    }
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .card:hover { transform: translateY(-3px); }

    /* top accent stripe */
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      border-radius: 14px 14px 0 0;
      transition: background .3s;
    }

    /* State reads from one place: a stripe down the left edge, plus the badge
       dot. Six accent colours competing on every card told you nothing extra. */
    .card::before {
      top: 0; left: 0; bottom: 0; right: auto;
      width: 3px; height: auto;
      border-radius: 14px 0 0 14px;
      background: var(--idle);
    }
    .card-ready::before,
    .card-authenticated::before { background: var(--live); }
    .card-qr_received::before,
    .card-pairing_code_received::before { background: var(--wants-you); }
    .card-disconnected::before { background: var(--down); }
    .card-initializing::before { background: var(--idle); }

    /* A card that needs someone leans forward; the rest stay quiet. */
    .card-qr_received, .card-pairing_code_received {
      border-color: rgba(245,158,11,.28);
      background: linear-gradient(180deg, rgba(245,158,11,.045), transparent 120px), var(--surface);
    }
    .card:hover { border-color: var(--border2); }
    .card-qr_received:hover, .card-pairing_code_received:hover { border-color: rgba(245,158,11,.45); }

    /* card header */
    .card-head {
      display: flex; align-items: flex-start;
      justify-content: space-between; gap: .5rem;
    }
    .card-identity { display: flex; align-items: center; gap: .45rem; flex-wrap: wrap; min-width: 0; }
    /* Sits before the name: what this client runs on, before what it is called.
       A real logo brings its own colours, so it is shown as-is rather than
       tinted; only the lettered fallback picks up the platform colour. */
    .platform-mark {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; flex-shrink: 0;
    }
    .platform-mark svg { width: 100%; height: 100%; display: block; }
    .platform-mark--initial {
      border-radius: 6px; background: var(--surface3);
      border: 1px solid var(--border2);
    }
    .platform-initial { font-size: .72rem; font-weight: 600; }

    .client-name {
      font-size: 1.05rem; font-weight: 600;
      color: #fff; letter-spacing: -.015em;
      line-height: 1.25; word-break: break-word;
    }
    .client-display-name {
      font-size: .78rem; font-weight: 400;
      color: var(--text2); margin-top: .1rem;
      word-break: break-word;
    }

    /* badge */
    .badge {
      flex-shrink: 0; display: flex; align-items: center; gap: .4rem;
      font-size: .7rem; font-weight: 500;
      padding: .18rem .5rem .18rem .45rem; border-radius: 100px;
      white-space: nowrap; border: 1px solid transparent;
      color: var(--text2); background: var(--surface2);
    }
    .badge-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
      background: var(--idle);
    }

    .badge-ready, .badge-authenticated { color: var(--live); }
    .badge-qr_received, .badge-pairing_code_received { color: var(--wants-you); }
    .badge-disconnected { color: var(--down); }

    .badge-ready .badge-dot, .badge-authenticated .badge-dot { background: var(--live); }
    .badge-qr_received .badge-dot,
    .badge-pairing_code_received .badge-dot { background: var(--wants-you); animation: blink 1.4s ease infinite; }
    .badge-disconnected .badge-dot { background: var(--down); }
    .badge-initializing .badge-dot { background: var(--idle); animation: blink 1.2s ease infinite; }
    @keyframes blink { 0%,100%{ opacity:1; } 50%{ opacity:.25; } }

    /* One quiet line of metadata: label only where the value alone is ambiguous. */
    .card-meta {
      display: flex; align-items: center; gap: .45rem 1.1rem; flex-wrap: wrap;
      font-size: .75rem; color: var(--muted);
    }
    .meta-label { color: var(--muted); font-weight: 400; }
    .prefix-tag {
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      font-size: .75rem; font-weight: 400; color: var(--text2);
    }
    /* The number identifies the client; it reads before the configuration. */
    .phone-tag {
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      font-size: .92rem; font-weight: 500; color: var(--text);
      letter-spacing: -.02em; margin-top: -.25rem;
    }

    /* duration */
    .card-duration { font-size: .75rem; color: var(--muted); }
    .card-duration strong { color: var(--text2); font-weight: 500; }

    /* divider */
    hr.card-hr { border: none; border-top: 1px solid var(--border); margin: .1rem 0 0; }

    /*
     * The one thing a waiting client is for. It gets the emphasis; everything
     * around it stays quiet. The QR keeps full contrast — a camera has to read
     * it — so it is sized down and framed instead of dimmed.
     */
    .qr-section { display: flex; flex-direction: column; gap: .55rem; align-items: center; }
    .qr-heading {
      align-self: stretch;
      font-size: .8rem; font-weight: 600; color: var(--text);
    }
    .qr-frame {
      background: #fff; border-radius: 10px; padding: .7rem;
      display: flex; justify-content: center;
      box-shadow: 0 0 0 1px rgba(245,158,11,.25), 0 10px 30px rgba(0,0,0,.45);
    }
    .qr-frame img { width: 148px; height: 148px; display: block; }
    .qr-hint {
      align-self: stretch;
      font-size: .72rem; color: var(--muted); line-height: 1.55;
    }
    .pair-code {
      align-self: stretch;
      font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
      font-size: 1.6rem; font-weight: 500; letter-spacing: .22em;
      /* indent by the tracking so the glyphs sit optically centred */
      text-indent: .22em;
      color: #fff; background: #05070f;
      border: 1px solid rgba(245,158,11,.35); border-radius: 10px;
      padding: .85rem .5rem; text-align: center; cursor: pointer; user-select: all;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.02), 0 8px 24px rgba(0,0,0,.4);
    }
    .pair-code:hover { border-color: rgba(245,158,11,.6); }

    /* empty / error */
    .empty {
      grid-column: 1/-1; text-align: center;
      padding: 5rem 2rem; color: var(--muted);
    }
    .empty-icon { font-size: 2rem; opacity: .35; margin-bottom: .75rem; }
    .empty-msg  { font-size: .9rem; font-weight: 500; }

    /* footer */
    footer {
      margin-top: 2.5rem;
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
      display: flex; align-items: center;
      justify-content: space-between;
      flex-wrap: wrap; gap: .5rem;
    }
    .footer-ts  { font-size: .7rem; color: var(--muted); }
    .footer-tip { font-size: .7rem; color: var(--muted); }
    kbd {
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: 4px; padding: .1rem .35rem;
      font-family: 'IBM Plex Mono', monospace; font-size: .67rem;
    }

    /* ── Action buttons ── */
    /* Buttons size to their label and wrap: five fit on two rows, and a lone
       one does not stretch across the whole card. */
    .card-actions { display: flex; flex-wrap: wrap; gap: .4rem; padding-top: .1rem; }
    .action-btn {
      flex: 0 1 auto;
      font-size: .74rem; font-weight: 500;
      padding: .36rem .5rem;
      white-space: nowrap;
      border-radius: 6px; border: 1px solid;
      cursor: pointer; font-family: inherit;
      transition: background .15s, border-color .15s, color .15s;
      background: transparent;
    }
    .action-btn:disabled { opacity: .35; cursor: not-allowed; }
    .action-btn-restart { border-color: var(--border2); color: var(--text2); }
    .action-btn-restart:hover:not(:disabled) { background: var(--surface3); border-color: var(--blue); color: var(--blue); }
    .action-btn-qr { border-color: rgba(42,212,191,.25); color: var(--teal); }
    .action-btn-qr:hover:not(:disabled) { background: var(--teal-glow); border-color: var(--teal); }
    .action-btn-logout { border-color: rgba(240,96,96,.25); color: var(--red); }
    .action-btn-logout:hover:not(:disabled) { background: var(--red-glow); border-color: var(--red); }
    .card-webhook { display: flex; flex-direction: column; gap: .4rem; }
    .webhook-label { font-size: .75rem; font-weight: 400; color: var(--muted); }
    .webhook-chips { display: flex; flex-wrap: wrap; gap: .35rem; }
    .webhook-chip {
      font-size: .65rem; font-weight: 600;
      padding: .2rem .55rem; border-radius: 100px;
      border: 1px solid transparent; cursor: pointer; font-family: inherit;
      letter-spacing: .04em; background: transparent;
      transition: background .15s, border-color .15s, color .15s;
    }
    .webhook-chip:disabled { opacity: .35; cursor: not-allowed; }
    .chip-bound   { background: rgba(34,199,139,.08); color: var(--green);  border-color: rgba(34,199,139,.35); }
    .chip-bound:hover:not(:disabled)   { background: rgba(34,199,139,.18); }
    .chip-unbound { background: rgba(77,90,122,.1);   color: var(--muted); border-color: var(--border2); }
    .chip-unbound:hover:not(:disabled) { background: var(--surface3); color: var(--text2); }
    .chip-virtual {
      font-size: .6rem; font-weight: 600;
      padding: .15rem .5rem; border-radius: 100px;
      background: rgba(160,100,240,.1); color: #b07ef8;
      border: 1px solid rgba(160,100,240,.3);
      flex-shrink: 0;
    }

    /* What the client's adapter can do. Collapsed by default: it is reference,
       not status, and sixteen chips would drown the card. */
    .caps { margin-top: .6rem; }
    .caps > summary {
      cursor: pointer; list-style: none;
      font-size: .68rem; color: var(--muted); letter-spacing: .03em;
      display: flex; align-items: center; gap: .35rem;
    }
    .caps > summary::-webkit-details-marker { display: none; }
    .caps > summary::before {
      content: '▸'; font-size: .6rem; transition: transform .15s;
    }
    .caps[open] > summary::before { transform: rotate(90deg); }
    .caps > summary:hover { color: var(--text2); }
    .caps-count { color: var(--text2); font-variant-numeric: tabular-nums; }
    .caps-list {
      display: flex; flex-wrap: wrap; gap: .25rem;
      margin-top: .5rem;
    }
    .cap {
      font-size: .6rem; font-weight: 500;
      padding: .15rem .45rem; border-radius: 4px;
      border: 1px solid var(--border2);
    }
    .cap-on  { background: rgba(34,199,139,.07); color: var(--green); border-color: rgba(34,199,139,.25); }
    .cap-off { background: transparent; color: var(--muted); text-decoration: line-through; opacity: .6; }

    .action-btn-remove { border-color: rgba(240,96,96,.25); color: var(--red); }
    .action-btn-remove:hover:not(:disabled) { background: var(--red-glow); border-color: var(--red); }

    /* ── Add client card ── */
    .add-client-card {
      background: var(--surface);
      border: 1px dashed var(--border2);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex; flex-direction: column; gap: .75rem;
      transition: border-color .2s;
    }
    .add-client-card:hover { border-color: #b07ef8; }

    .add-client-trigger {
      background: transparent; border: none;
      color: var(--muted); font-family: inherit;
      font-size: .8rem; font-weight: 500;
      cursor: pointer; padding: 0; text-align: left;
      transition: color .15s;
      display: flex; align-items: center; gap: .4rem;
    }
    .add-client-trigger:hover { color: #b07ef8; }

    .add-client-form { display: flex; flex-direction: column; gap: .6rem; }
    .add-form-input {
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: 7px; color: var(--text);
      font-family: 'IBM Plex Mono', monospace; font-size: .8rem;
      padding: .45rem .75rem; outline: none;
      transition: border-color .15s; width: 100%;
    }
    .add-form-input:focus { border-color: #b07ef8; }
    .add-form-input::placeholder { color: var(--muted); }
        .action-btn-edit { color: var(--text2); border-color: var(--border2); }
    .action-btn-edit:hover:not(:disabled) { background: var(--surface3); border-color: var(--text2); color: var(--text); }
    .edit-form { display: flex; flex-direction: column; gap: .3rem; margin-top: .2rem; }
    .edit-form-title {
      font-size: .74rem; font-weight: 700; color: var(--text);
      margin-bottom: .2rem;
    }
    .edit-form-danger {
      font-size: .66rem; line-height: 1.5; color: var(--orange);
      background: var(--orange-glow); border: 1px solid var(--orange);
      border-radius: 6px; padding: .4rem .55rem; margin: .45rem 0 .1rem;
    }
    .add-form-fields { display: flex; flex-direction: column; gap: .3rem; }
    .add-form-field { display: flex; flex-direction: column; gap: .2rem; }
    .add-form-field[hidden] { display: none; }
    .add-form-radios { display: flex; flex-direction: column; gap: .3rem; margin: .2rem 0 .1rem; }
    .add-form-radio {
      display: flex; align-items: flex-start; gap: .45rem; cursor: pointer;
      border: 1px solid var(--border2); border-radius: 8px; padding: .45rem .55rem;
      transition: border-color .15s, background .15s;
    }
    .add-form-radio:hover { border-color: var(--teal); background: var(--surface3); }
    .add-form-radio input { accent-color: var(--teal); cursor: pointer; margin-top: .12rem; }
    .add-form-radio strong { display: block; font-size: .74rem; font-weight: 600; color: var(--text2); }
    .add-form-radio em { display: block; font-style: normal; font-size: .66rem; color: var(--muted); line-height: 1.45; }
    .add-form-radio:has(input:checked) { border-color: var(--teal); background: var(--teal-glow); }
    .add-form-radio:has(input:checked) strong { color: var(--text); }
    .add-form-label {
      font-size: .78rem; font-weight: 500; color: var(--text2);
      margin-top: .35rem;
    }
    .add-form-hint { font-size: .7rem; color: var(--muted); line-height: 1.45; }
    .add-form-check {
      display: flex; align-items: center; gap: .45rem; font-size: .75rem;
      color: var(--text2); margin-top: .35rem; cursor: pointer;
    }
    .add-form-check input { accent-color: var(--teal); cursor: pointer; }
    .add-form-advanced { margin-top: .2rem; }
    .add-form-advanced {
      margin-top: .35rem; border-top: 1px solid var(--border); padding-top: .5rem;
    }
    .add-form-advanced summary {
      font-size: .78rem; font-weight: 500; color: var(--text2); cursor: pointer;
      padding: .15rem 0; list-style: none; display: flex; align-items: center; gap: .35rem;
    }
    .add-form-advanced summary::-webkit-details-marker { display: none; }
    .add-form-advanced summary::before {
      content: '▸'; color: var(--muted); font-size: .7rem; transition: transform .15s;
    }
    .add-form-advanced[open] summary::before { transform: rotate(90deg); }
    .add-form-advanced summary:hover { color: var(--text); }
    .add-form-advanced > .add-form-fields { margin-top: .45rem; }
    .add-form-advanced summary:hover { color: var(--text2); }
    .add-form-advanced .add-form-input { margin-top: .35rem; }
    .add-form-textarea {
      resize: vertical; min-height: 3.2rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: .72rem; line-height: 1.5;
    }
    select.add-form-input { cursor: pointer; }
    .add-form-error {
      display: none; font-size: .7rem; line-height: 1.5; color: var(--red);
      background: var(--red-glow); border: 1px solid var(--red); border-radius: 6px;
      padding: .4rem .55rem; word-break: break-word;
    }
    .add-form-btns { display: flex; gap: .5rem; }
    .add-form-btn {
      flex: 1; font-size: .67rem; font-weight: 600;
      padding: .35rem .5rem; border-radius: 6px; border: 1px solid;
      cursor: pointer; font-family: inherit;
      transition: background .15s, border-color .15s, color .15s;
      background: transparent;
    }
    .add-form-btn-cancel { border-color: var(--border2); color: var(--text2); }
    .add-form-btn-cancel:hover { background: var(--surface3); }
    .add-form-btn-create { border-color: rgba(160,100,240,.35); color: #b07ef8; }
    .add-form-btn-create:hover { background: rgba(160,100,240,.1); border-color: #b07ef8; }
    .add-form-btn-create:disabled { opacity: .4; cursor: not-allowed; }

    /* ── Toast ── */
    .toast-wrap {
      position: fixed; bottom: 1.5rem; right: 1.5rem;
      display: flex; flex-direction: column; gap: .4rem; z-index: 200;
      pointer-events: none;
    }
    .toast {
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: 8px; padding: .55rem 1rem;
      font-size: .76rem; font-weight: 500; color: var(--text);
      animation: toast-in .2s ease both;
      max-width: 240px;
    }
    .toast.ok  { border-color: rgba(34,199,139,.4); color: var(--green); }
    .toast.err { border-color: rgba(240,96,96,.4);  color: var(--red); }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Offline banner ── */
    .conn-banner {
      display: none;
      align-items: center;
      gap: .6rem;
      background: var(--red-glow);
      border: 1px solid rgba(240,96,96,.3);
      border-radius: 10px;
      padding: .75rem 1.25rem;
      margin-bottom: 1.5rem;
      color: var(--red);
      font-size: .8rem;
      font-weight: 500;
    }
    .conn-banner.visible { display: flex; }
    .conn-banner-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--red); flex-shrink: 0;
    }

    .grid--offline .card {
      opacity: .3;
      pointer-events: none;
      filter: grayscale(.4);
      transition: opacity .3s, filter .3s;
    }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      .shell { padding: 1.25rem .9rem; }
      header { margin-bottom: 1.5rem; }
      .grid {
      align-items: start; grid-template-columns: 1fr; gap: .75rem; }
      .stat-card { min-width: 95px; padding: .75rem .9rem; }
      .stat-n { font-size: 1.7rem; }
      .footer-tip { display: none; }
    }

    @media (min-width: 481px) and (max-width: 860px) {
      .grid {
      align-items: start; grid-template-columns: repeat(2, 1fr); }
    }

    @media (prefers-reduced-motion: reduce) {
      .card-entering { animation: none; }
      .ripple-dot::after, .badge-dot { animation: none !important; }
    }

    /* ── Modal ── */
    .modal-overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(6,9,18,.75);
      backdrop-filter: blur(4px);
      z-index: 300;
      align-items: center; justify-content: center;
    }
    .modal-overlay.visible { display: flex; }
    .modal {
      background: var(--surface);
      border: 1px solid var(--border2);
      border-radius: 14px;
      padding: 1.75rem 1.5rem 1.25rem;
      max-width: 340px; width: calc(100% - 2rem);
      animation: modal-in .15s ease both;
    }
    @keyframes modal-in {
      from { opacity: 0; transform: scale(.95) translateY(8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-msg {
      font-size: .875rem; color: var(--text);
      margin-bottom: 1.25rem; line-height: 1.55;
      white-space: pre-wrap;
    }
    .modal-btns { display: flex; gap: .5rem; justify-content: flex-end; }
    .modal-btn {
      font-size: .75rem; font-weight: 600;
      padding: .45rem .9rem;
      border-radius: 7px; border: 1px solid;
      cursor: pointer; font-family: inherit;
      transition: background .15s, border-color .15s, color .15s;
    }
    .modal-btn-cancel { background: transparent; border-color: var(--border2); color: var(--text2); }
    .modal-btn-cancel:hover { background: var(--surface2); }
    .modal-btn-confirm { background: transparent; }
    .modal-btn-confirm.danger  { border-color: rgba(240,96,96,.35);  color: var(--red);  }
    .modal-btn-confirm.danger:hover  { background: var(--red-glow);  border-color: var(--red);  }
    .modal-btn-confirm.default { border-color: rgba(91,138,240,.35); color: var(--blue); }
    .modal-btn-confirm.default:hover { background: var(--blue-glow); border-color: var(--blue); }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="brand">
        <div class="brand-logo">${NESTWHATS_LOGO}</div>
        <div>
          <div class="brand-name">NestWhats</div>
          <div class="brand-sub">Client Monitor</div>
        </div>
      </div>
      <div class="header-actions">
        <button class="refresh-btn" onclick="doRefresh()" title="Press R">↺ Refresh</button>
        <div class="live-badge">
          <div class="ripple-dot" id="ripple-dot"></div>
          <span id="live-label">Connecting…</span>
        </div>
      </div>
    </header>

    <div class="toast-wrap" id="toast-wrap"></div>

    <div class="conn-banner" id="conn-banner">
      <div class="conn-banner-dot"></div>
      <span>Lost connection to server — reconnecting…</span>
    </div>

    <div class="stats-bar">
      <div class="stat-card stat-total">
        <div class="stat-n" id="s-total">—</div>
        <div class="stat-l">Total</div>
      </div>
      <div class="stat-card stat-ready">
        <div class="stat-n" id="s-ready">—</div>
        <div class="stat-l">Ready</div>
      </div>
      <div class="stat-card stat-auth">
        <div class="stat-n" id="s-auth">—</div>
        <div class="stat-l">Authenticated</div>
      </div>
      <div class="stat-card stat-qr">
        <div class="stat-n" id="s-qr">—</div>
        <div class="stat-l">Awaiting QR</div>
      </div>
      <div class="stat-card stat-disc">
        <div class="stat-n" id="s-disc">—</div>
        <div class="stat-l">Disconnected</div>
      </div>
    </div>

    <div class="grid" id="grid">
      <div class="empty">
        <div class="empty-icon">◌</div>
        <div class="empty-msg">Connecting to registry…</div>
      </div>
    </div>

    <footer>
      <div class="footer-ts" id="footer-ts">—</div>
      <div class="footer-tip">Press <kbd>R</kbd> to refresh manually</div>
    </footer>
  </div>

  <div class="modal-overlay" id="modal-overlay">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-msg" id="modal-msg"></div>
      <div class="modal-btns">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel">Cancel</button>
        <button class="modal-btn modal-btn-confirm" id="modal-confirm">Confirm</button>
      </div>
    </div>
  </div>

  <script>
    const ACTION_TOKEN = '${token}';
    const HAS_WEBHOOK  = ${hasWebhook ? "true" : "false"};
    const HAS_CLIENTS  = ${hasClientManager ? "true" : "false"};
    const ADAPTERS     = ${JSON.stringify(adapters)};

    const grid       = document.getElementById('grid');
    const footerTs   = document.getElementById('footer-ts');
    const rippleDot  = document.getElementById('ripple-dot');
    const liveLabel  = document.getElementById('live-label');
    const connBanner = document.getElementById('conn-banner');

    let connected = false;

    const modalOverlay = document.getElementById('modal-overlay');
    const modalMsg     = document.getElementById('modal-msg');
    const modalCancel  = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    let modalResolve = null;

    function showConfirm(message, variant = 'danger') {
      return new Promise(resolve => {
        modalResolve = resolve;
        modalMsg.textContent = message;
        modalConfirm.className = 'modal-btn modal-btn-confirm ' + variant;
        modalOverlay.classList.add('visible');
        modalConfirm.focus();
      });
    }

    function closeModal(result) {
      modalOverlay.classList.remove('visible');
      if (modalResolve) { modalResolve(result); modalResolve = null; }
    }

    modalCancel.addEventListener('click', () => closeModal(false));
    modalConfirm.addEventListener('click', () => closeModal(true));
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(false); });

    /**
     * Inline editor on a virtual client's card. Prefix applies live; options
     * force a reconnect, so that half is behind its own confirmation.
     */
    function openEditForm(name, config) {
      const card = cardMap.get(name);
      if (!card || card.querySelector('.edit-form')) return;

      const adapterName = config?.adapter;
      const adapter = ADAPTERS.find(a => a.name === adapterName) ?? ADAPTERS[0];
      const schema = adapter?.optionsSchema ?? [];
      const current = config?.options ?? {};
      const readPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

      const fields = schema.map(f => {
        const id = 'edit-' + name + '-' + f.key;
        const value = readPath(current, f.key);
        const hint = f.description ? \`<span class="add-form-hint">\${f.description}</span>\` : '';
        if (f.type === 'boolean') {
          const on = value === undefined ? f.default === true : !!value;
          return \`<label class="add-form-check"><input type="checkbox" id="\${id}" data-key="\${f.key}" data-type="boolean" data-default="\${f.default === true}" \${on ? 'checked' : ''} /><span>\${f.label}</span></label>\${hint}\`;
        }
        if (f.type === 'select') {
          const opts = ['<option value="">(default)</option>']
            .concat((f.choices ?? []).map(c => \`<option value="\${c}" \${c === value ? 'selected' : ''}>\${c}</option>\`)).join('');
          return \`<label class="add-form-label" for="\${id}">\${f.label}</label><select class="add-form-input" id="\${id}" data-key="\${f.key}" data-type="select">\${opts}</select>\${hint}\`;
        }
        const inputType = f.type === 'number' ? 'number' : 'text';
        const v = value == null ? '' : String(value).replace(/"/g, '&quot;');
        return \`<label class="add-form-label" for="\${id}">\${f.label}</label><input class="add-form-input" id="\${id}" type="\${inputType}" value="\${v}" data-key="\${f.key}" data-type="\${f.type}" placeholder="\${f.placeholder ?? ''}" />\${hint}\`;
      }).join('');

      const box = document.createElement('div');
      box.className = 'edit-form';
      box.innerHTML = \`
        <hr class="card-hr" />
        <div class="edit-form-title">Edit "\${name}"</div>
        <label class="add-form-label" for="edit-prefix-\${name}">Prefix</label>
        <span class="add-form-hint">Applies immediately, no reconnect.</span>
        <input class="add-form-input" id="edit-prefix-\${name}" type="text" value="\${(config?.prefix ?? '').replace(/"/g, '&quot;')}" placeholder="!" />
        <div class="edit-form-danger">Changing the options below reconnects the client. The session is kept — it will not ask for a new QR.</div>
        <div class="add-form-fields" id="edit-fields-\${name}">\${fields}</div>
        <div class="add-form-error" id="edit-error-\${name}"></div>
        <div class="add-form-btns">
          <button class="add-form-btn add-form-btn-cancel" data-edit="cancel">Cancel</button>
          <button class="add-form-btn add-form-btn-create" data-edit="save">Save</button>
        </div>
      \`;
      card.appendChild(box);

      const setErr = (msg) => {
        const el = box.querySelector('#edit-error-' + name);
        el.textContent = msg || '';
        el.style.display = msg ? 'block' : 'none';
      };

      box.querySelector('[data-edit="cancel"]').addEventListener('click', () => box.remove());
      box.querySelector('[data-edit="save"]').addEventListener('click', async () => {
        const prefix = box.querySelector('#edit-prefix-' + name).value.trim() || undefined;

        const options = {};
        box.querySelectorAll('#edit-fields-' + name + ' [data-key]').forEach(el => {
          const key = el.dataset.key;
          if (el.dataset.type === 'boolean') {
            const isDefault = el.dataset.default === 'true';
            if (el.checked !== isDefault) setPath(options, key, el.checked);
            return;
          }
          const value = el.value.trim();
          if (!value) return;
          setPath(options, key, el.dataset.type === 'number' ? Number(value) : value);
        });

        const optionsChanged = JSON.stringify(options) !== JSON.stringify(current);
        if (optionsChanged && !await showConfirm(\`Apply new options to "\${name}"?\\nThe client reconnects; the session is kept.\`, 'default')) return;

        const body = { prefix };
        if (optionsChanged) body.options = options;

        const btn = box.querySelector('[data-edit="save"]');
        btn.disabled = true;
        try {
          const res = await fetch(\`./api/virtual-clients/\${encodeURIComponent(name)}\`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-Action-Token': ACTION_TOKEN },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            showToast(\`"\${name}" updated\`, 'ok');
            box.remove();
          } else {
            const detail = await res.text().catch(() => '');
            setErr(detail || 'Failed to update client');
          }
        } catch {
          setErr('Could not reach server');
        } finally {
          btn.disabled = false;
        }
      });
    }

    /** Writes a value at a dotted path: pairWithPhoneNumber.phoneNumber. */
    function setPath(target, path, value) {
      const parts = path.split('.');
      const last = parts.pop();
      let cursor = target;
      for (const part of parts) {
        if (typeof cursor[part] !== 'object' || cursor[part] === null) cursor[part] = {};
        cursor = cursor[part];
      }
      cursor[last] = value;
    }

    function setOnline() {
      connected = true;
      connBanner.classList.remove('visible');
      grid.classList.remove('grid--offline');
      rippleDot.classList.remove('offline');
      liveLabel.textContent = 'Live · SSE';
    }

    function setOffline() {
      connected = false;
      connBanner.classList.add('visible');
      grid.classList.add('grid--offline');
      rippleDot.classList.add('offline');
      liveLabel.textContent = 'Reconnecting…';
    }

    const LABEL = {
      initializing:  'Initializing',
      qr_received:   'Awaiting QR',
      pairing_code_received: 'Awaiting code',
      authenticated: 'Authenticated',
      ready:         'Ready',
      disconnected:  'Disconnected',
    };

    const cardMap = new Map();
    const configMap = new Map();
    /** Passkey challenges by client, kept off the DOM: the page signs them. */
    const passkeyMap = new Map();
    const passkeyResultSeen = new Map();
    let showingEmpty = true;

    function buildWebhookHTML(name, availableHandlers, boundHandlers) {
      if (!HAS_WEBHOOK || !availableHandlers || !availableHandlers.length) return '';
      const n = name.replace(/"/g, '&quot;');
      const chips = availableHandlers.map(h => {
        const bound  = boundHandlers && boundHandlers.includes(h.key);
        const cls    = bound ? 'webhook-chip chip-bound' : 'webhook-chip chip-unbound';
        const method = h.key.split('.')[1] ?? h.key;
        const hk     = h.key.replace(/"/g, '&quot;');
        return \`<button class="\${cls}" title="\${h.event} · \${h.type}" data-action="webhook-toggle" data-handler="\${hk}" data-bound="\${bound}" data-client="\${n}">\${method}</button>\`;
      }).join('');
      return \`<div class="card-webhook"><span class="webhook-label">Webhook</span><div class="webhook-chips">\${chips}</div></div>\`;
    }

    /**
     * A client set up with pairWithPhoneNumber never shows a QR — forcing
     * re-auth gives it a new pairing code, so the button has to say that.
     */
    function usesPairingCode(name) {
      const opts = configMap.get(name)?.options;
      return !!opts?.pairWithPhoneNumber?.phoneNumber;
    }

    function buildActionsHTML(status, name, isVirtual) {
      const n = name.replace(/"/g, '&quot;');
      const forceLabel = usesPairingCode(name) ? '⟳ New code' : '⟳ Force QR';
      if (isVirtual) {
        const remove = \`<button class="action-btn action-btn-remove" data-action="destroy-virtual-client" data-client="\${n}">✕ Remove</button>\`;
        const edit   = \`<button class="action-btn action-btn-edit" data-action="edit-virtual-client" data-client="\${n}">✎ Edit</button>\`;
        if (status === 'initializing') return \`<div class="card-actions">\${edit}\${remove}</div>\`;
        const restart = \`<button class="action-btn action-btn-restart" data-action="restart" data-client="\${n}">↺ Restart</button>\`;
        const forceQr = \`<button class="action-btn action-btn-qr" data-action="force-qr" data-client="\${n}">\${forceLabel}</button>\`;
        const logout  = \`<button class="action-btn action-btn-logout" data-action="logout" data-client="\${n}">⏏ Logout</button>\`;
        const btns = (status === 'ready' || status === 'authenticated')
          ? restart + forceQr + logout + edit + remove
          : restart + edit + remove;
        return \`<div class="card-actions">\${btns}</div>\`;
      }
      if (status === 'initializing') return '';
      const restart = \`<button class="action-btn action-btn-restart" data-action="restart"   data-client="\${n}">↺ Restart</button>\`;
      const forceQr = \`<button class="action-btn action-btn-qr"      data-action="force-qr" data-client="\${n}">\${forceLabel}</button>\`;
      const logout  = \`<button class="action-btn action-btn-logout"   data-action="logout"   data-client="\${n}">⏏ Logout</button>\`;
      const btns = (status === 'ready' || status === 'authenticated')
        ? restart + forceQr + logout
        : restart;
      return \`<div class="card-actions">\${btns}</div>\`;
    }

    const ACTION_LABELS = { restart: 'Restarting', 'force-qr': 'Forcing new QR', logout: 'Logging out', 'passkey-cancel': 'Cancelling passkey for' };

    let addClientCardEl = null;

    function currentAdapter(root) {
      const picker = root.querySelector('#vc-adapter');
      const name = picker?.value;
      return ADAPTERS.find(a => a.name === name) ?? ADAPTERS[0];
    }

    /** The value a field currently holds, for evaluating showWhen. */
    function fieldValue(root, key) {
      const el = root.querySelector(\`[data-key="\${key}"]\`);
      if (!el) return undefined;
      if (el.dataset.type === 'boolean') return el.checked;
      if (el.dataset.type === 'radio') {
        return root.querySelector(\`[data-key="\${key}"]:checked\`)?.value;
      }
      return el.value;
    }

    function fieldVisible(root, f) {
      if (!f.showWhen) return true;
      return String(fieldValue(root, f.showWhen.key)) === String(f.showWhen.equals);
    }

    /** Shows or hides conditional fields after something they depend on changes. */
    function applyFieldConditions(root, schema, host) {
      for (const f of schema) {
        if (!f.showWhen) continue;
        const wrap = host.querySelector(\`[data-field="\${f.key}"]\`);
        if (wrap) wrap.hidden = !fieldVisible(root, f);
      }
    }

    /** One input per option. Markup only — placement is decided by the caller. */
    function renderField(f) {
      const id = 'vcopt-' + f.key;
      const hint = f.description ? \`<span class="add-form-hint">\${f.description}</span>\` : '';
      const open = \`<div class="add-form-field" data-field="\${f.key}">\`;

      if (f.type === 'radio') {
        const opts = (f.choices ?? []).map(c => {
          const value = typeof c === 'string' ? c : c.value;
          const label = typeof c === 'string' ? c : c.label;
          const desc  = typeof c === 'string' ? '' : (c.description ?? '');
          const on = value === f.default;
          return \`<label class="add-form-radio">
            <input type="radio" name="\${id}" value="\${value}" data-key="\${f.key}" data-type="radio" \${on ? 'checked' : ''} />
            <span><strong>\${label}</strong>\${desc ? \`<em>\${desc}</em>\` : ''}</span>
          </label>\`;
        }).join('');
        return \`\${open}<span class="add-form-label">\${f.label}</span>\${hint}<div class="add-form-radios">\${opts}</div></div>\`;
      }
      if (f.type === 'boolean') {
        const on = f.default === true;
        return \`\${open}<label class="add-form-check">
          <input type="checkbox" id="\${id}" data-key="\${f.key}" data-type="boolean"
                 data-default="\${on}" \${on ? 'checked' : ''} />
          <span>\${f.label}</span>
        </label>\${hint}</div>\`;
      }
      if (f.type === 'select') {
        const opts = ['<option value="">(default)</option>']
          .concat((f.choices ?? []).map(c => {
            const value = typeof c === 'string' ? c : c.value;
            const label = typeof c === 'string' ? c : c.label;
            return \`<option value="\${value}">\${label}</option>\`;
          })).join('');
        return \`\${open}<label class="add-form-label" for="\${id}">\${f.label}</label>
          <select class="add-form-input" id="\${id}" data-key="\${f.key}" data-type="select">\${opts}</select>\${hint}</div>\`;
      }
      const inputType = f.type === 'number' ? 'number' : 'text';
      return \`\${open}<label class="add-form-label" for="\${id}">\${f.label}</label>
        <input class="add-form-input" id="\${id}" type="\${inputType}"
               data-key="\${f.key}" data-type="\${f.type}" placeholder="\${f.placeholder ?? ''}" />\${hint}</div>\`;
    }

    /**
     * Two tiers: the few options that decide how a client connects stay in
     * view, and the tuning nobody touches folds away. A flat list of ten
     * fields with a paragraph under each buried the two that matter.
     */
    function renderAdapterFields(root) {
      const host = root.querySelector('#vc-fields');
      const adapter = currentAdapter(root);
      const schema = adapter?.optionsSchema ?? [];
      if (!schema.length) { host.innerHTML = ''; return; }

      const primary  = schema.filter(f => !f.advanced).map(renderField).join('');
      const advanced = schema.filter(f => f.advanced).map(renderField).join('');

      host.innerHTML = primary + (advanced
        ? \`<details class="add-form-advanced"><summary>More settings</summary>
             <div class="add-form-fields">\${advanced}</div></details>\`
        : '');

      const drivers = new Set(schema.filter(f => f.showWhen).map(f => f.showWhen.key));
      for (const key of drivers) {
        host.querySelectorAll(\`[data-key="\${key}"]\`).forEach(el =>
          el.addEventListener('change', () => applyFieldConditions(root, schema, host)));
      }
      applyFieldConditions(root, schema, host);
    }

    /**
     * Collects the generated fields into an options object. Empty inputs are
     * left out entirely so the adapter's own defaults apply — sending "" would
     * override them with an empty value.
     */
    function collectAdapterOptions(root) {
      const options = {};
      const schema = currentAdapter(root)?.optionsSchema ?? [];
      const uiOnly = new Set(schema.filter(f => f.uiOnly).map(f => f.key));

      root.querySelectorAll('#vc-fields [data-key]').forEach(el => {
        const key = el.dataset.key;
        // A ui-only field shapes the form; it is not an adapter option. A hidden
        // one belongs to a mode that is not selected, so whatever it holds is
        // stale and must not be sent.
        if (uiOnly.has(key)) return;
        if (el.closest('[data-field]')?.hidden) return;

        if (el.dataset.type === 'boolean') {
          const isDefault = el.dataset.default === 'true';
          if (el.checked !== isDefault) setPath(options, key, el.checked);
          return;
        }
        const value = el.value.trim();
        if (!value) return;
        setPath(options, key, el.dataset.type === 'number' ? Number(value) : value);
      });
      return options;
    }

    function setFormError(root, message) {
      const el = root.querySelector('#vc-error');
      if (!el) return;
      el.textContent = message || '';
      el.style.display = message ? 'block' : 'none';
    }

    function buildAddClientCard() {
      const div = document.createElement('div');
      div.className = 'add-client-card';
      div.id = 'add-client-card';
      div.innerHTML = \`
        <button class="add-client-trigger" id="add-client-trigger">＋ Add virtual client</button>
        <div class="add-client-form" id="add-client-form" style="display:none">
          <input class="add-form-input" id="vc-name"   type="text" placeholder="Name (e.g. BOT2)" />
          <input class="add-form-input" id="vc-prefix" type="text" placeholder="Prefix (default: !)" />
          \${ADAPTERS.length > 1 ? \`
          <label class="add-form-label" for="vc-adapter">Adapter</label>
          <select class="add-form-input" id="vc-adapter">
            \${ADAPTERS.map(a => \`<option value="\${a.name}">\${a.name}</option>\`).join('')}
          </select>\` : ''}
          <div class="add-form-fields" id="vc-fields"></div>
          <details class="add-form-advanced">
            <summary>Raw options (JSON)</summary>
            <textarea class="add-form-input add-form-textarea" id="vc-options" rows="3"
              placeholder='Merged over the fields above&#10;{ "webVersion": "2.3000.0" }'></textarea>
          </details>
          <div class="add-form-error" id="vc-error"></div>
          <div class="add-form-btns">
            <button class="add-form-btn add-form-btn-cancel" id="add-form-cancel">Cancel</button>
            <button class="add-form-btn add-form-btn-create" id="add-form-create">Create</button>
          </div>
        </div>
      \`;
      renderAdapterFields(div);
      div.querySelector('#vc-adapter')?.addEventListener('change', () => renderAdapterFields(div));

      div.querySelector('#add-client-trigger').addEventListener('click', () => {
        div.querySelector('#add-client-form').style.display = 'flex';
        div.querySelector('#add-client-trigger').style.display = 'none';
        div.querySelector('#vc-name').focus();
      });
      div.querySelector('#add-form-cancel').addEventListener('click', () => {
        div.querySelector('#add-client-form').style.display = 'none';
        div.querySelector('#add-client-trigger').style.display = '';
        div.querySelector('#vc-name').value = '';
        div.querySelector('#vc-prefix').value = '';
        div.querySelector('#vc-options').value = '';
        renderAdapterFields(div);
        setFormError(div, '');
      });
      div.querySelector('#add-form-create').addEventListener('click', async () => {
        const name   = div.querySelector('#vc-name').value.trim();
        const prefix = div.querySelector('#vc-prefix').value.trim() || undefined;
        if (!name) { div.querySelector('#vc-name').focus(); return; }

        // Adapter is only asked for when more than one is registered; with a
        // single one the core resolves it on its own.
        const adapter = div.querySelector('#vc-adapter')?.value || undefined;

        let options = collectAdapterOptions(div);

        // The advanced box is merged last, so it can reach options the schema
        // does not cover — and override a field when someone means to.
        const rawOptions = div.querySelector('#vc-options').value.trim();
        if (rawOptions) {
          let extra;
          try {
            extra = JSON.parse(rawOptions);
          } catch (err) {
            setFormError(div, 'Advanced options must be valid JSON: ' + err.message);
            div.querySelector('#vc-options').focus();
            return;
          }
          if (typeof extra !== 'object' || extra === null || Array.isArray(extra)) {
            setFormError(div, 'Advanced options must be a JSON object, e.g. { "webVersion": "2.3000.0" }');
            div.querySelector('#vc-options').focus();
            return;
          }
          options = { ...options, ...extra };
        }
        if (!Object.keys(options).length) options = undefined;
        setFormError(div, '');

        const btn = div.querySelector('#add-form-create');
        btn.disabled = true;
        try {
          const res = await fetch('./api/virtual-clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Action-Token': ACTION_TOKEN },
            body: JSON.stringify({ action: 'create-virtual-client', name, prefix, adapter, options }),
          });
          if (res.ok) {
            showToast(\`Virtual client "\${name}" created\`, 'ok');
            div.querySelector('#add-form-cancel').click();
          } else {
            const detail = await res.text().catch(() => '');
            setFormError(div, detail || 'Failed to create client');
            showToast(detail || 'Failed to create client', 'err');
          }
        } catch {
          showToast('Could not reach server', 'err');
        } finally {
          btn.disabled = false;
        }
      });
      return div;
    }

    async function doAction(name, action, extra) {
      if (action === 'edit-virtual-client') {
        openEditForm(name, configMap.get(name));
        return;
      }
      if (action === 'passkey') {
        await signPasskey(name);
        return;
      }

      if (action === 'restart'  && !await showConfirm(\`Restart "\${name}"?\`, 'default')) return;
      if (action === 'logout'   && !await showConfirm(\`Logout "\${name}"?\\nThis will require scanning a new QR code.\`)) return;
      if (action === 'force-qr') {
        const what = usesPairingCode(name) ? 'pairing code' : 'QR code';
        if (!await showConfirm(\`Force a new \${what} for "\${name}"?\\nCurrent session will be logged out.\`)) return;
      }
      if (action === 'destroy-virtual-client' && !await showConfirm(\`Remove virtual client "\${name}"?\\nThis will disconnect and delete it.\`)) return;

      if (action === 'destroy-virtual-client') {
        const card = cardMap.get(name);
        card?.querySelectorAll('.action-btn').forEach(b => b.disabled = true);
        try {
          const res = await fetch(\`./api/virtual-clients/\${encodeURIComponent(name)}\`, {
            method: 'DELETE',
            headers: { 'X-Action-Token': ACTION_TOKEN },
          });
          if (res.ok) showToast(\`Removed "\${name}"\`, 'ok');
          else showToast(await res.text().catch(() => '') || 'Failed to remove client', 'err');
        } catch {
          showToast('Could not reach server', 'err');
        }
        return;
      }

      const card = cardMap.get(name);
      if (action === 'webhook-toggle') {
        card?.querySelectorAll('.webhook-chip').forEach(b => b.disabled = true);
      } else {
        card?.querySelectorAll('.action-btn').forEach(b => b.disabled = true);
      }

      const payload = action === 'webhook-toggle'
        ? { action, handler: extra.handler, bound: !extra.bound }
        : { action };

      try {
        const res = await fetch(\`./api/clients/\${encodeURIComponent(name)}/action\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Action-Token': ACTION_TOKEN },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const method = extra.handler?.split('.')[1] ?? extra.handler;
          if (action === 'webhook-toggle') showToast(\`\${extra.bound ? 'Unbound' : 'Bound'} \${method} on \${name}\`, 'ok');
          else showToast(\`\${ACTION_LABELS[action] ?? action} \${name}…\`, 'ok');
        } else {
          showToast('Action failed', 'err');
        }
      } catch {
        showToast('Could not reach server', 'err');
      }
    }

    /**
     * A WhatsApp id carries bare digits; people read a phone number grouped.
     * Brazilian numbers get the local shape, everything else just gets its
     * country code split off rather than guessed at.
     */
    function formatPhone(digits) {
      const d = String(digits).replace(/D/g, '');
      if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
        const ddd = d.slice(2, 4);
        const rest = d.slice(4);
        const head = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
        const tail = rest.length === 9 ? rest.slice(5) : rest.slice(4);
        return \`+55 \${ddd} \${head}-\${tail}\`;
      }
      if (d.length > 10) return \`+\${d.slice(0, d.length - 10)} \${d.slice(d.length - 10)}\`;
      return d;
    }

    function since(ts) {
      const s = Math.floor((Date.now() - ts) / 1000);
      if (s < 60) return s + 's';
      const m = Math.floor(s / 60);
      if (m < 60) return m + 'm ' + (s % 60) + 's';
      const h = Math.floor(m / 60);
      return h + 'h ' + (m % 60) + 'm';
    }

    function updateStats(clients) {
      document.getElementById('s-total').textContent = clients.length;
      document.getElementById('s-ready').textContent = clients.filter(c => c.status === 'ready').length;
      document.getElementById('s-auth').textContent  = clients.filter(c => c.status === 'authenticated').length;
      document.getElementById('s-qr').textContent    = clients.filter(c => c.status === 'qr_received').length;
      document.getElementById('s-disc').textContent  = clients.filter(c => c.status === 'disconnected').length;
    }

    function showToast(msg, type = '') {
      const wrap = document.getElementById('toast-wrap');
      const el = document.createElement('div');
      el.className = 'toast' + (type ? ' ' + type : '');
      el.textContent = msg;
      wrap.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }

    /**
     * Signs WhatsApp's passkey challenge with the browser's own authenticator
     * and posts the assertion back. Only works if the passkey WhatsApp asks
     * for is on this device — a challenge for web.whatsapp.com can only be
     * answered by a credential registered for it.
     */
    async function signPasskey(name) {
      const requestOptions = passkeyMap.get(name);
      if (!requestOptions) { showToast('No passkey challenge waiting', 'err'); return; }
      if (!window.PublicKeyCredential || !navigator.credentials) {
        showToast('This browser cannot use passkeys', 'err');
        return;
      }
      const btn = cardMap.get(name)?.querySelector('[data-action="passkey"]');
      if (btn) btn.disabled = true;
      try {
        const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON
          ? PublicKeyCredential.parseRequestOptionsFromJSON(requestOptions)
          : parseRequestOptions(requestOptions);
        const credential = await navigator.credentials.get({ publicKey });
        const assertion = typeof credential.toJSON === 'function'
          ? credential.toJSON()
          : serializeAssertion(credential);
        const res = await fetch(\`./api/clients/\${encodeURIComponent(name)}/action\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Action-Token': ACTION_TOKEN },
          body: JSON.stringify({ action: 'passkey', assertion }),
        });
        if (res.ok) showToast(\`Passkey sent for \${name}, waiting for WhatsApp…\`, 'ok');
        else showToast(await res.text().catch(() => '') || 'Passkey rejected', 'err');
      } catch (err) {
        showToast(err?.name === 'NotAllowedError' ? 'Passkey prompt cancelled' : \`Passkey failed: \${err?.message ?? err}\`, 'err');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    const b64urlToBuf = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer;
    const bufToB64url = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/+/g, '-').replace(///g, '_').replace(/=+$/, '');

    /** Older browsers: the WebAuthn JSON helpers by hand. */
    function parseRequestOptions(o) {
      return {
        ...o,
        challenge: b64urlToBuf(o.challenge),
        allowCredentials: (o.allowCredentials ?? []).map(c => ({ ...c, id: b64urlToBuf(c.id) })),
      };
    }
    function serializeAssertion(c) {
      return {
        id: c.id, rawId: bufToB64url(c.rawId), type: c.type,
        response: {
          clientDataJSON: bufToB64url(c.response.clientDataJSON),
          authenticatorData: bufToB64url(c.response.authenticatorData),
          signature: bufToB64url(c.response.signature),
          userHandle: c.response.userHandle ? bufToB64url(c.response.userHandle) : null,
        },
      };
    }

    function buildPasskeyHTML(name) {
      return \`
        <hr class="card-hr" />
        <div class="qr-section">
          <div class="qr-heading">WhatsApp asks for the account's passkey</div>
          <button class="action-btn action-btn-qr" data-action="passkey" data-client="\${name}">🔑 Use passkey</button>
          <div class="qr-hint">Sign with the passkey registered for this account on this device. Cancel to give up on this attempt.</div>
          <button class="action-btn action-btn-restart" data-action="passkey-cancel" data-client="\${name}">Cancel</button>
        </div>
      \`;
    }

    function buildQrHTML(qr) {
      return \`
        <hr class="card-hr" />
        <div class="qr-section">
          <div class="qr-heading">Scan this to connect</div>
          <div class="qr-frame"><img class="qr-img" src="\${qr}" alt="QR Code" /></div>
          <div class="qr-hint">WhatsApp → Linked devices → Link a device, then point the camera here.</div>
        </div>
      \`;
    }

    function buildPairingHTML(code) {
      const grouped = String(code).replace(/(.{4})(?=.)/g, '$1-');
      return \`
        <hr class="card-hr" />
        <div class="qr-section">
          <div class="qr-heading">Type this code on the phone</div>
          <div class="pair-code" title="Click to copy">\${grouped}</div>
          <div class="qr-hint">WhatsApp → Linked devices → Link with phone number. A new code is issued if this one expires.</div>
        </div>
      \`;
    }

    /**
     * Which platform is behind this client. The mark says how it connects — a
     * browser window for whatsapp-web.js — so the difference is legible at a
     * glance once more than one adapter is in play. The SVG comes from the
     * adapter package, not from user data.
     */
    function buildPlatformHTML(platform) {
      if (!platform) return '';
      const label = (platform.label || platform.id || '').replace(/"/g, '&quot;');
      const hasIcon = !!platform.icon;
      // only the lettered fallback is tinted; a logo carries its own palette
      const style = !hasIcon && platform.color ? \` style="color:\${platform.color}"\` : '';
      const cls = hasIcon ? 'platform-mark' : 'platform-mark platform-mark--initial';
      const body = hasIcon
        ? platform.icon
        : \`<span class="platform-initial">\${(label[0] || '?').toUpperCase()}</span>\`;
      return \`<span class="\${cls}" title="\${label}" aria-label="\${label}"\${style}>\${body}</span>\`;
    }

    /* Every capability known when the page was built — the core's own plus
       whatever the loaded platform packages registered. The card shows what is
       missing as well as what is there: the absent half is the useful one. */
    const ALL_CAPS = ${JSON.stringify(getKnownCapabilities())};

    function buildCapsHTML(capabilities) {
      const on = new Set(capabilities || []);
      const chips = ALL_CAPS.map((cap) =>
        \`<span class="cap \${on.has(cap) ? 'cap-on' : 'cap-off'}">\${cap}</span>\`
      ).join('');
      return \`
        <details class="caps">
          <summary>capabilities <span class="caps-count">\${on.size}/\${ALL_CAPS.length}</span></summary>
          <div class="caps-list">\${chips}</div>
        </details>
      \`;
    }

    function buildCardHTML(c) {
      const displayNameHTML = c.displayName
        ? \`<div class="client-display-name">\${c.displayName}</div>\`
        : '';
      const phoneHTML = c.phone
        ? \`<span class="phone-tag">\${formatPhone(c.phone)}</span>\`
        : '';
      const virtualBadge = c.virtual ? \`<span class="chip-virtual">virtual</span>\` : '';
      const platformBadge = buildPlatformHTML(c.platform);
      const boundKey = (c.webhookBoundHandlers ?? []).join(',');
      return \`
        <div class="card card-entering card-\${c.status}" data-client="\${c.name}" data-status="\${c.status}" data-status-at="\${c.statusAt}" data-webhook-bound-handlers="\${boundKey}" data-virtual="\${!!c.virtual}">
          <div class="card-head">
            <div class="card-identity">
              \${platformBadge}
              <span class="client-name">\${c.name}</span>
              \${virtualBadge}
              \${displayNameHTML}
            </div>
            <span class="badge badge-\${c.status}">
              <span class="badge-dot"></span>
              <span class="badge-label">\${LABEL[c.status] || c.status}</span>
            </span>
          </div>
          \${phoneHTML}
          <div class="card-meta">
            <span><span class="meta-label">prefix</span> <span class="prefix-tag">\${c.prefix}</span></span>
            <span class="card-duration">\${since(c.statusAt)} in this state</span>
          </div>
          \${buildCapsHTML(c.capabilities)}
          \${buildWebhookHTML(c.name, c.webhookAvailableHandlers, c.webhookBoundHandlers)}
          \${c.passkeyChallenge ? buildPasskeyHTML(c.name) : c.qr ? buildQrHTML(c.qr) : (c.pairingCode ? buildPairingHTML(c.pairingCode) : '')}
          \${buildActionsHTML(c.status, c.name, c.virtual)}
        </div>
      \`;
    }

    function patchCard(el, c) {
      const statusChanged  = el.dataset.status !== c.status;
      const newBoundKey    = (c.webhookBoundHandlers ?? []).join(',');
      const boundChanged   = HAS_WEBHOOK && el.dataset.webhookBoundHandlers !== newBoundKey;
      const virtualChanged = el.dataset.virtual !== String(!!c.virtual);

      if (statusChanged) {
        el.className = 'card card-' + c.status;
        el.dataset.status   = c.status;
        el.dataset.statusAt = c.statusAt;
        const badge = el.querySelector('.badge');
        badge.className = 'badge badge-' + c.status;
        el.querySelector('.badge-label').textContent = LABEL[c.status] || c.status;
      }

      if (virtualChanged) {
        el.dataset.virtual = String(!!c.virtual);
        const existing = el.querySelector('.chip-virtual');
        if (c.virtual && !existing) {
          el.querySelector('.client-name').insertAdjacentHTML('afterend', '<span class="chip-virtual">virtual</span>');
        } else if (!c.virtual && existing) {
          existing.remove();
        }
      }

      if (statusChanged || virtualChanged) {
        const existing = el.querySelector('.card-actions');
        if (existing) existing.remove();
        const newActions = buildActionsHTML(c.status, c.name, c.virtual);
        if (newActions) el.insertAdjacentHTML('beforeend', newActions);
      }

      if (boundChanged) {
        el.dataset.webhookBoundHandlers = newBoundKey;
        const existing = el.querySelector('.card-webhook');
        if (existing) existing.remove();
        const newWebhook = buildWebhookHTML(c.name, c.webhookAvailableHandlers, c.webhookBoundHandlers);
        if (newWebhook) {
          const duration = el.querySelector('.card-duration');
          duration.insertAdjacentHTML('beforebegin', newWebhook);
        }
      }



      const existingPN = el.querySelector('.client-display-name');
      if (c.displayName && !existingPN) {
        el.querySelector('.client-name').insertAdjacentHTML('afterend', '<div class="client-display-name">' + c.displayName + '</div>');
      } else if (c.displayName && existingPN) {
        existingPN.textContent = c.displayName;
      } else if (!c.displayName && existingPN) {
        existingPN.remove();
      }

      const existingPlatform = el.querySelector('.platform-mark');
      if (c.platform && !existingPlatform) {
        el.querySelector('.card-identity').insertAdjacentHTML('afterbegin', buildPlatformHTML(c.platform));
      } else if (!c.platform && existingPlatform) {
        existingPlatform.remove();
      }

      const existingPhone = el.querySelector('.phone-tag');
      if (c.phone && !existingPhone) {
        el.querySelector('.card-head').insertAdjacentHTML('afterend',
          '<span class="phone-tag">' + formatPhone(c.phone) + '</span>');
      } else if (c.phone && existingPhone) {
        existingPhone.textContent = formatPhone(c.phone);
      } else if (!c.phone && existingPhone) {
        existingPhone.remove();
      }

      el.querySelector('.card-duration').textContent = since(c.statusAt) + ' in this state';

      // One panel holds the passkey prompt, the QR or the pairing code; a
      // client wants one at a time, and switching replaces the whole section.
      // The passkey wins: it arrives after the pairing code, which is then
      // stale until the challenge is answered.
      const panel   = el.querySelector('.qr-section');
      const wantsPasskey = !!c.passkeyChallenge;
      const wantsQr = !wantsPasskey && !!c.qr;
      const wantsPair = !wantsPasskey && !c.qr && !!c.pairingCode;

      if (!wantsPasskey && !wantsQr && !wantsPair) {
        if (panel) { el.querySelector('.card-hr')?.remove(); panel.remove(); }
      } else if (!panel) {
        el.insertAdjacentHTML('beforeend', wantsPasskey ? buildPasskeyHTML(c.name) : wantsQr ? buildQrHTML(c.qr) : buildPairingHTML(c.pairingCode));
      } else if (wantsPasskey) {
        if (!panel.querySelector('[data-action="passkey"]')) {
          panel.outerHTML = buildPasskeyHTML(c.name).replace(/^[sS]*?<div class="qr-section"/, '<div class="qr-section"');
        }
      } else if (wantsQr) {
        const img = panel.querySelector('.qr-img');
        if (img) img.src = c.qr;
        else { panel.outerHTML = buildQrHTML(c.qr).replace(/^[sS]*?<div class="qr-section"/, '<div class="qr-section"'); }
      } else {
        const codeEl = panel.querySelector('.pair-code');
        const grouped = String(c.pairingCode).replace(/(.{4})(?=.)/g, '$1-');
        if (codeEl) { if (codeEl.textContent !== grouped) codeEl.textContent = grouped; }
        else { panel.outerHTML = buildPairingHTML(c.pairingCode).replace(/^[sS]*?<div class="qr-section"/, '<div class="qr-section"'); }
      }
    }

    function setEmpty(msg) {
      for (const [, el] of cardMap) el.remove();
      cardMap.clear();
      grid.innerHTML =
        '<div class="empty"><div class="empty-icon">◌</div><div class="empty-msg">' + msg + '</div></div>';
      showingEmpty = true;
    }

    function render(clients) {
      updateStats(clients);
      for (const c of clients) if (c.config) configMap.set(c.name, c.config);
      passkeyMap.clear();
      for (const c of clients) {
        if (c.passkeyChallenge) passkeyMap.set(c.name, c.passkeyChallenge);
        // A result is announced once; the payload keeps carrying it.
        if (c.passkeyResult && passkeyResultSeen.get(c.name) !== c.passkeyResult.at) {
          passkeyResultSeen.set(c.name, c.passkeyResult.at);
          showToast(c.passkeyResult.ok ? \`Passkey accepted for \${c.name}\` : \`Passkey failed for \${c.name}: \${c.passkeyResult.error ?? 'unknown'}\`, c.passkeyResult.ok ? 'ok' : 'err');
        }
      }

      if (!clients.length && !HAS_CLIENTS) {
        setEmpty('No clients registered yet.');
        footerTs.textContent = 'Last updated ' + new Date().toLocaleTimeString();
        return;
      }

      if (showingEmpty) {
        grid.innerHTML = '';
        showingEmpty = false;
      }

      const seen = new Set(clients.map(c => c.name));
      for (const [name, el] of cardMap) {
        if (!seen.has(name)) { el.remove(); cardMap.delete(name); }
      }

      for (const c of clients) {
        if (cardMap.has(c.name)) {
          patchCard(cardMap.get(c.name), c);
        } else {
          const tmp = document.createElement('div');
          tmp.innerHTML = buildCardHTML(c);
          const card = tmp.firstElementChild;
          addClientCardEl ? grid.insertBefore(card, addClientCardEl) : grid.appendChild(card);
          cardMap.set(c.name, card);
          setTimeout(() => card.classList.remove('card-entering'), 400);
        }
      }

      if (HAS_CLIENTS && !addClientCardEl) {
        addClientCardEl = buildAddClientCard();
        grid.appendChild(addClientCardEl);
      }

      footerTs.textContent = 'Last updated ' + new Date().toLocaleTimeString();
    }

    async function doRefresh() {
      try {
        render(await fetch('./api/clients').then(r => r.json()));
      } catch {
        setEmpty('Could not reach the dashboard API.');
      }
    }

    const es = new EventSource('./events');
    es.onopen = () => setOnline();
    es.onmessage = e => { setOnline(); render(JSON.parse(e.data)); };
    es.onerror = () => setOffline();

    setInterval(() => {
      if (!connected) return;
      for (const el of document.querySelectorAll('[data-status-at]')) {
        el.querySelector('.card-duration').textContent =
          since(Number(el.dataset.statusAt)) + ' in this state';
      }
    }, 1000);

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const extra = { handler: btn.dataset.handler, bound: btn.dataset.bound === 'true' };
      doAction(btn.dataset.client, btn.dataset.action, extra);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModal(false); return; }
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) doRefresh();
    });
  </script>
</body>
</html>`;
}

/** The login page, rendered when `auth` is configured. */
export function getLoginHtml(path: string): string {
	return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NestWhats · Login</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:      #060912;
      --surface: #0c1022;
      --surface2:#111728;
      --border:  #1c2442;
      --border2: #26304e;
      --text:    #dde4f4;
      --muted:   #4d5a7a;
      --red:     #f06060;
      --red-glow:rgba(240,96,96,.14);
      --teal:    #2ad4bf;
    }
    body {
      background: var(--bg);
      background-image: radial-gradient(circle, #18213a 1px, transparent 1px);
      background-size: 26px 26px;
      color: var(--text);
      font-family: 'IBM Plex Sans', system-ui, sans-serif;
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
    }
    .login-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; padding: 2.25rem 2rem;
      width: 100%; max-width: 340px;
    }
    .brand { display: flex; align-items: center; gap: .75rem; margin-bottom: 2rem; }
    .brand-logo {
      width: 38px; height: 38px;
      display: flex; align-items: center; justify-content: center;
    }
    .brand-logo svg { width: 100%; height: 100%; display: block; }
    .brand-name { font-size: 1.1rem; font-weight: 700; color: #fff; letter-spacing: -.02em; }
    .brand-sub { font-size: .78rem; color: var(--muted); margin-top: .15rem; }
    label { display: block; font-size: .78rem; font-weight: 500; color: var(--text2); margin-bottom: .4rem; }
    .field { margin-bottom: 1rem; }
    input {
      width: 100%;
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: 8px; color: var(--text);
      font-family: inherit; font-size: .875rem;
      padding: .6rem .85rem; outline: none;
      transition: border-color .15s;
    }
    input:focus { border-color: var(--teal); }
    .submit-btn {
      width: 100%; margin-top: .5rem;
      background: var(--teal); border: none; border-radius: 8px;
      color: #060912;
      font-family: inherit; font-size: .875rem; font-weight: 700;
      padding: .7rem; cursor: pointer;
      transition: opacity .15s;
    }
    .submit-btn:hover { opacity: .88; }
    .submit-btn:active { transform: scale(.98); }
    .submit-btn:disabled { opacity: .4; cursor: not-allowed; }
    .error-msg {
      display: none; margin-top: .75rem;
      background: var(--red-glow);
      border: 1px solid rgba(240,96,96,.3);
      border-radius: 8px; padding: .55rem .85rem;
      font-size: .78rem; color: var(--red);
    }
    .error-msg.visible { display: block; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="brand">
      <div class="brand-logo">${NESTWHATS_LOGO}</div>
      <div>
        <div class="brand-name">NestWhats</div>
        <div class="brand-sub">Dashboard</div>
      </div>
    </div>
    <form id="form">
      <div class="field">
        <label for="username">Username</label>
        <input id="username" type="text" autocomplete="username" required autofocus />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" required />
      </div>
      <button class="submit-btn" type="submit" id="submit-btn">Sign in</button>
      <div class="error-msg" id="error-msg">Invalid username or password.</div>
    </form>
  </div>
  <script>
    const form = document.getElementById('form');
    const btn  = document.getElementById('submit-btn');
    const err  = document.getElementById('error-msg');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      err.classList.remove('visible');
      try {
        const res = await fetch('/${path}/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
          }),
        });
        if (res.ok) {
          location.reload();
        } else {
          err.classList.add('visible');
          btn.disabled = false;
          btn.textContent = 'Sign in';
        }
      } catch {
        err.textContent = 'Could not reach the server.';
        err.classList.add('visible');
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    });
  </script>
</body>
</html>`;
}
