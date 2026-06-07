export function getDashboardHtml(token: string, hasWebhook: boolean): string {
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
      width: 44px; height: 44px;
      background: var(--surface2);
      border: 1px solid var(--border2);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem; flex-shrink: 0;
    }

    .brand-name {
      font-size: 1.2rem; font-weight: 700;
      color: #fff; letter-spacing: -.02em; line-height: 1.1;
    }

    .brand-sub {
      font-size: .68rem; color: var(--muted);
      letter-spacing: .08em; text-transform: uppercase; margin-top: .2rem;
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
      font-size: .67rem; font-weight: 500;
      color: var(--muted);
      text-transform: uppercase; letter-spacing: .08em;
    }

    /* ── Grid ── */
    .grid {
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

    .card-ready::before        { background: var(--green); }
    .card-authenticated::before{ background: var(--teal);  }
    .card-qr_received::before  { background: var(--orange);}
    .card-disconnected::before { background: var(--red);   }
    .card-initializing::before { background: var(--blue);  }

    .card-ready        { border-color: rgba(34,199,139,.2); }
    .card-authenticated{ border-color: rgba(42,212,191,.2); }
    .card-qr_received  { border-color: rgba(245,158,11,.2); }
    .card-disconnected { border-color: rgba(240,96,96,.2);  }
    .card-initializing { border-color: rgba(91,138,240,.2); }

    .card-ready:hover        { box-shadow: 0 8px 40px var(--green-glow);  border-color: rgba(34,199,139,.4); }
    .card-authenticated:hover{ box-shadow: 0 8px 40px var(--teal-glow);   border-color: rgba(42,212,191,.4); }
    .card-qr_received:hover  { box-shadow: 0 8px 40px var(--orange-glow); border-color: rgba(245,158,11,.4); }
    .card-disconnected:hover { box-shadow: 0 8px 40px var(--red-glow);    border-color: rgba(240,96,96,.4);  }
    .card-initializing:hover { box-shadow: 0 8px 40px var(--blue-glow);   border-color: rgba(91,138,240,.4); }

    /* card header */
    .card-head {
      display: flex; align-items: flex-start;
      justify-content: space-between; gap: .5rem;
    }

    .client-name {
      font-size: 1rem; font-weight: 600;
      color: #fff; letter-spacing: -.01em;
      line-height: 1.3; word-break: break-word;
    }
    .client-pushname {
      font-size: .75rem; font-weight: 400;
      color: var(--text2); margin-top: .15rem;
      word-break: break-word;
    }

    /* badge */
    .badge {
      flex-shrink: 0; display: flex; align-items: center; gap: .35rem;
      font-size: .65rem; font-weight: 600;
      padding: .22rem .65rem; border-radius: 100px;
      text-transform: uppercase; letter-spacing: .07em;
      white-space: nowrap; border: 1px solid transparent;
      transition: background .3s, color .3s, border-color .3s;
    }
    .badge-dot {
      width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
      transition: background .3s;
    }

    .badge-ready         { background: var(--green-glow);  color: var(--green);  border-color: rgba(34,199,139,.3); }
    .badge-authenticated { background: var(--teal-glow);   color: var(--teal);   border-color: rgba(42,212,191,.3); }
    .badge-qr_received   { background: var(--orange-glow); color: var(--orange); border-color: rgba(245,158,11,.3); }
    .badge-disconnected  { background: var(--red-glow);    color: var(--red);    border-color: rgba(240,96,96,.3);  }
    .badge-initializing  { background: var(--blue-glow);   color: var(--blue);   border-color: rgba(91,138,240,.3); }

    .badge-ready .badge-dot         { background: var(--green);  animation: blink 2s ease infinite; }
    .badge-qr_received .badge-dot   { background: var(--orange); animation: blink 1.4s ease infinite; }
    .badge-initializing .badge-dot  { background: var(--blue);   animation: blink 1s ease infinite; }
    .badge-disconnected .badge-dot  { background: var(--red); }
    .badge-authenticated .badge-dot { background: var(--teal); }
    @keyframes blink { 0%,100%{ opacity:1; } 50%{ opacity:.25; } }

    /* meta */
    .card-meta { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .meta-label {
      font-size: .67rem; font-weight: 500;
      color: var(--muted); text-transform: uppercase; letter-spacing: .07em;
    }
    .prefix-tag {
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      font-size: .75rem; font-weight: 500;
      color: var(--text);
      background: var(--surface3); border: 1px solid var(--border2);
      padding: .18rem .55rem; border-radius: 6px;
    }

    /* duration */
    .card-duration { font-size: .75rem; color: var(--muted); }
    .card-duration strong { color: var(--text2); font-weight: 600; }

    /* divider */
    hr.card-hr { border: none; border-top: 1px solid var(--border); }

    /* QR */
    .qr-section { display: flex; flex-direction: column; gap: .7rem; }
    .qr-heading {
      font-size: .72rem; font-weight: 600; color: var(--orange);
      text-transform: uppercase; letter-spacing: .08em;
    }
    .qr-frame {
      background: #fff; border-radius: 12px; padding: .9rem;
      display: flex; justify-content: center;
    }
    .qr-frame img { width: 176px; height: 176px; display: block; }
    .qr-hint { font-size: .72rem; color: var(--muted); line-height: 1.65; }

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
    .card-actions { display: flex; gap: .5rem; padding-top: .1rem; }
    .action-btn {
      flex: 1;
      font-size: .67rem; font-weight: 600;
      padding: .32rem .5rem;
      border-radius: 6px; border: 1px solid;
      cursor: pointer; font-family: inherit;
      letter-spacing: .04em; text-transform: uppercase;
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
    .webhook-label { font-size: .65rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
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
      text-transform: uppercase; letter-spacing: .07em;
      flex-shrink: 0;
    }

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
    .add-form-btns { display: flex; gap: .5rem; }
    .add-form-btn {
      flex: 1; font-size: .67rem; font-weight: 600;
      padding: .35rem .5rem; border-radius: 6px; border: 1px solid;
      cursor: pointer; font-family: inherit;
      letter-spacing: .04em; text-transform: uppercase;
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
      .grid { grid-template-columns: 1fr; gap: .75rem; }
      .stat-card { min-width: 95px; padding: .75rem .9rem; }
      .stat-n { font-size: 1.7rem; }
      .footer-tip { display: none; }
    }

    @media (min-width: 481px) and (max-width: 860px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
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
      letter-spacing: .04em; text-transform: uppercase;
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
        <div class="brand-logo">🤖</div>
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
      authenticated: 'Authenticated',
      ready:         'Ready',
      disconnected:  'Disconnected',
    };

    const cardMap = new Map();
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

    function buildActionsHTML(status, name, isVirtual) {
      const n = name.replace(/"/g, '&quot;');
      if (isVirtual) {
        const remove = \`<button class="action-btn action-btn-remove" data-action="destroy-virtual-client" data-client="\${n}">✕ Remove</button>\`;
        if (status === 'initializing') return \`<div class="card-actions">\${remove}</div>\`;
        const restart = \`<button class="action-btn action-btn-restart" data-action="restart" data-client="\${n}">↺ Restart</button>\`;
        const forceQr = \`<button class="action-btn action-btn-qr" data-action="force-qr" data-client="\${n}">⟳ Force QR</button>\`;
        const logout  = \`<button class="action-btn action-btn-logout" data-action="logout" data-client="\${n}">⏏ Logout</button>\`;
        const btns = (status === 'ready' || status === 'authenticated')
          ? restart + forceQr + logout + remove
          : restart + remove;
        return \`<div class="card-actions">\${btns}</div>\`;
      }
      if (status === 'initializing') return '';
      const restart = \`<button class="action-btn action-btn-restart" data-action="restart"   data-client="\${n}">↺ Restart</button>\`;
      const forceQr = \`<button class="action-btn action-btn-qr"      data-action="force-qr" data-client="\${n}">⟳ Force QR</button>\`;
      const logout  = \`<button class="action-btn action-btn-logout"   data-action="logout"   data-client="\${n}">⏏ Logout</button>\`;
      const btns = (status === 'ready' || status === 'authenticated')
        ? restart + forceQr + logout
        : restart;
      return \`<div class="card-actions">\${btns}</div>\`;
    }

    const ACTION_LABELS = { restart: 'Restarting', 'force-qr': 'Forcing new QR', logout: 'Logging out' };

    let addClientCardEl = null;

    function buildAddClientCard() {
      const div = document.createElement('div');
      div.className = 'add-client-card';
      div.id = 'add-client-card';
      div.innerHTML = \`
        <button class="add-client-trigger" id="add-client-trigger">＋ Add virtual client</button>
        <div class="add-client-form" id="add-client-form" style="display:none">
          <input class="add-form-input" id="vc-name"   type="text" placeholder="Name (e.g. BOT2)" />
          <input class="add-form-input" id="vc-prefix" type="text" placeholder="Prefix (default: !)" />
          <div class="add-form-btns">
            <button class="add-form-btn add-form-btn-cancel" id="add-form-cancel">Cancel</button>
            <button class="add-form-btn add-form-btn-create" id="add-form-create">Create</button>
          </div>
        </div>
      \`;
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
      });
      div.querySelector('#add-form-create').addEventListener('click', async () => {
        const name   = div.querySelector('#vc-name').value.trim();
        const prefix = div.querySelector('#vc-prefix').value.trim() || undefined;
        if (!name) { div.querySelector('#vc-name').focus(); return; }
        const btn = div.querySelector('#add-form-create');
        btn.disabled = true;
        try {
          const res = await fetch('./api/virtual-clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Action-Token': ACTION_TOKEN },
            body: JSON.stringify({ action: 'create-virtual-client', name, prefix }),
          });
          if (res.ok) {
            showToast(\`Virtual client "\${name}" created\`, 'ok');
            div.querySelector('#add-form-cancel').click();
          } else {
            showToast('Failed to create client', 'err');
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
      if (action === 'restart'  && !await showConfirm(\`Restart "\${name}"?\`, 'default')) return;
      if (action === 'logout'   && !await showConfirm(\`Logout "\${name}"?\\nThis will require scanning a new QR code.\`)) return;
      if (action === 'force-qr' && !await showConfirm(\`Force new QR for "\${name}"?\\nCurrent session will be logged out.\`)) return;
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
          else showToast('Failed to remove client', 'err');
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

    function buildQrHTML(qr) {
      return \`
        <hr class="card-hr" />
        <div class="qr-section">
          <div class="qr-heading">📱 Scan to connect</div>
          <div class="qr-frame"><img class="qr-img" src="\${qr}" alt="QR Code" /></div>
          <div class="qr-hint">
            Open WhatsApp → Linked Devices → Link a Device<br>
            Point your phone camera at the code above
          </div>
        </div>
      \`;
    }

    function buildCardHTML(c) {
      const pushnameHTML = c.pushname
        ? \`<div class="client-pushname">\${c.pushname}</div>\`
        : '';
      const phoneHTML = c.phone
        ? \`<span class="meta-label">number</span><span class="prefix-tag phone-tag">\${c.phone}</span>\`
        : '';
      const virtualBadge = c.virtual ? \`<span class="chip-virtual">virtual</span>\` : '';
      const boundKey = (c.webhookBoundHandlers ?? []).join(',');
      return \`
        <div class="card card-entering card-\${c.status}" data-client="\${c.name}" data-status="\${c.status}" data-status-at="\${c.statusAt}" data-webhook-bound-handlers="\${boundKey}" data-virtual="\${!!c.virtual}">
          <div class="card-head">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
              <span class="client-name">\${c.name}</span>
              \${virtualBadge}
              \${pushnameHTML}
            </div>
            <span class="badge badge-\${c.status}">
              <span class="badge-dot"></span>
              <span class="badge-label">\${LABEL[c.status] || c.status}</span>
            </span>
          </div>
          <div class="card-meta">
            <span class="meta-label">prefix</span>
            <span class="prefix-tag">\${c.prefix}</span>
            \${phoneHTML}
          </div>
          \${buildWebhookHTML(c.name, c.webhookAvailableHandlers, c.webhookBoundHandlers)}
          <div class="card-duration">In this state for <strong>\${since(c.statusAt)}</strong></div>
          \${c.qr ? buildQrHTML(c.qr) : ''}
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



      const existingPN = el.querySelector('.client-pushname');
      if (c.pushname && !existingPN) {
        el.querySelector('.client-name').insertAdjacentHTML('afterend', '<div class="client-pushname">' + c.pushname + '</div>');
      } else if (c.pushname && existingPN) {
        existingPN.textContent = c.pushname;
      } else if (!c.pushname && existingPN) {
        existingPN.remove();
      }

      const existingPhone = el.querySelector('.phone-tag');
      if (c.phone && !existingPhone) {
        el.querySelector('.card-meta').insertAdjacentHTML('beforeend',
          '<span class="meta-label">number</span><span class="prefix-tag phone-tag">' + c.phone + '</span>');
      } else if (c.phone && existingPhone) {
        existingPhone.textContent = c.phone;
      } else if (!c.phone && existingPhone) {
        existingPhone.previousElementSibling?.remove();
        existingPhone.remove();
      }

      el.querySelector('.card-duration').innerHTML =
        'In this state for <strong>' + since(c.statusAt) + '</strong>';

      const hasQr = !!el.querySelector('.qr-section');
      if (c.qr && !hasQr) {
        el.insertAdjacentHTML('beforeend', buildQrHTML(c.qr));
      } else if (c.qr && hasQr) {
        el.querySelector('.qr-img').src = c.qr;
      } else if (!c.qr && hasQr) {
        el.querySelector('.card-hr')?.remove();
        el.querySelector('.qr-section').remove();
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

      if (!clients.length && !HAS_WEBHOOK) {
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

      if (HAS_WEBHOOK && !addClientCardEl) {
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
        el.querySelector('.card-duration').innerHTML =
          'In this state for <strong>' + since(Number(el.dataset.statusAt)) + '</strong>';
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
      width: 40px; height: 40px;
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem;
    }
    .brand-name { font-size: 1.1rem; font-weight: 700; color: #fff; letter-spacing: -.02em; }
    .brand-sub { font-size: .65rem; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; margin-top: .15rem; }
    label { display: block; font-size: .7rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: .45rem; }
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
      <div class="brand-logo">🤖</div>
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
