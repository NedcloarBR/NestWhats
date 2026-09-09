import type * as Preset from "@docusaurus/preset-classic";
import npm2yarn from "@docusaurus/remark-plugin-npm2yarn";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

/**
 * Docusaurus builds one locale at a time and says which through this variable.
 *
 * The API reference is generated from the packages' TSDoc, which is English, so
 * it is built for the default locale only — a translated site would otherwise
 * carry an English API section with a Portuguese sidebar around it. It also
 * cannot be built twice: the six packages each produce a `classes` category,
 * and Docusaurus refuses duplicate sidebar translation keys.
 */
const LOCALE = process.env.DOCUSAURUS_CURRENT_LOCALE ?? "en";
const IS_DEFAULT_LOCALE = LOCALE === "en";

const GITHUB_ORG = "NedcloarBR";
const GITHUB_REPO = "NestWhats";
const EDIT_BASE = `https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/tree/master/apps/docs`;

/** Every published package, in the order the sidebar and API reference use. */
const PACKAGES = [
	"core",
	"platform-wwjs",
	"platform-baileys",
	"dashboard",
	"webhook",
	"locale",
] as const;

const config: Config = {
	title: "NestWhats",
	tagline: "A NestJS framework for working with WhatsApp",
	favicon: "img/logo.png",

	// GitHub Pages serves a project site under /<repo>/, so the base URL is the
	// repo name. A custom domain would make this "/".
	url: `https://${GITHUB_ORG.toLowerCase()}.github.io`,
	baseUrl: `/${GITHUB_REPO}/`,
	organizationName: GITHUB_ORG,
	projectName: GITHUB_REPO,
	trailingSlash: false,

	// Fail the build on a broken link rather than shipping one: the API pages
	// are generated, so a rename would otherwise rot silently.
	onBrokenLinks: "throw",
	// Anchors only warn, because a handful come from TypeDoc itself: it links a
	// subclass to an inherited member's anchor that its own output never emits.
	// Those are generated pages we do not control, and a broken *link* — the
	// serious kind — still fails.
	onBrokenAnchors: "warn",
	markdown: {
		hooks: { onBrokenMarkdownLinks: "throw" },
	},

	i18n: {
		defaultLocale: "en",
		locales: ["en", "pt-BR"],
		localeConfigs: {
			en: { label: "English", htmlLang: "en-GB" },
			"pt-BR": { label: "Português (Brasil)", htmlLang: "pt-BR" },
		},
	},

	// IBM Plex was drawn for a technology company and reads that way: the sans is
	// plain without being neutral, and the mono is the same voice, which keeps
	// prose and code from looking like two different documents.
	headTags: [
		{
			tagName: "link",
			attributes: { rel: "preconnect", href: "https://fonts.googleapis.com" },
		},
		{
			tagName: "link",
			attributes: {
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossorigin: "anonymous",
			},
		},
	],

	stylesheets: [
		"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
	],

	future: {
		// The v4 behaviours that do not pull in the experimental bundler, so the
		// eventual upgrade is not a rewrite and the build stays on webpack.
		v4: {
			removeLegacyPostBuildHeadAttribute: true,
			useCssCascadeLayers: false,
		},
	},

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
					// Turns a ```bash npm2yarn block into npm / yarn / pnpm tabs. The
					// repo itself uses yarn and the test app uses pnpm, so npm-only
					// instructions would be wrong for most people reading this.
					remarkPlugins: [
						[npm2yarn, { sync: true, converters: ["yarn", "pnpm"] }],
					],
					editUrl: EDIT_BASE,
					showLastUpdateTime: true,
					// The API reference is generated for the default locale only, so a
					// translated build has to leave it out entirely. `api/**` alone
					// misses the nested pages, and half-excluding them is what breaks
					// the build: the pages still compile, but the links between them
					// point at siblings the plugin no longer knows about.
					exclude: IS_DEFAULT_LOCALE ? [] : ["api/**/*", "api/*", "api/**"],
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	clientModules: ["./src/searchShortcut.ts"],
	themes: [
		[
			"@easyops-cn/docusaurus-search-local",
			{
				// An index built at compile time and shipped with the site: no
				// Algolia account, no crawler, nothing to apply for.
				hashed: true,
				indexBlog: false,
				docsRouteBasePath: "/docs",
				// Stemming for both locales the site publishes.
				language: ["en", "pt"],
				highlightSearchTermsOnTargetPage: true,
				searchResultLimits: 10,
				searchResultContextMaxLength: 60,
			},
		],
	],
	plugins: IS_DEFAULT_LOCALE
		? [
				[
					"docusaurus-plugin-typedoc",
					{
						// One TypeDoc run over every package, so the API reference is the
						// TSDoc in the source rather than a second copy that drifts.
						//
						// "resolve" with its own tsconfig rather than "packages": each
						// package's own tsconfig maps `nestwhats` to the core's *source* for
						// editor DX, and with an outDir set TypeScript infers a rootDir that
						// the mapped files fall outside of. One program over every package
						// has no such boundary.
						entryPoints: PACKAGES.map(
							(p) => `../../packages/${p}/src/index.ts`,
						),
						entryPointStrategy: "resolve",
						tsconfig: "./typedoc.tsconfig.json",
						out: "docs/api",
						readme: "none",
						// Adapters extend Node's EventEmitter, so without these every adapter
						// page inherits the whole of Node's EventEmitter documentation — pages
						// of noise, and its JSDoc writes types as `{EventTarget}`, which MDX
						// then evaluates as a JavaScript expression and fails on.
						excludeExternals: true,
						mergeReadme: false,
						sidebar: { autoConfiguration: true, pretty: true },
						textContentMappings: {
							"title.indexPage": "API Reference",
							"title.memberPage": "{name}",
						},
						parametersFormat: "table",
						enumMembersFormat: "table",
						typeDeclarationFormat: "table",
						useCodeBlocks: true,
						expandObjects: true,
						hidePageHeader: true,
						hideBreadcrumbs: true,
					},
				],
			]
		: [],

	themeConfig: {
		image: "img/logo.png",
		colorMode: {
			// The reader's own setting decides; `defaultMode` is only the fallback
			// for a browser that reports no preference at all.
			defaultMode: "light",
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: "NestWhats",
			logo: { alt: "NestWhats", src: "img/logo.svg" },
			items: [
				{
					type: "docSidebar",
					sidebarId: "guide",
					position: "left",
					label: "Documentation",
				},
				// The TypeDoc reference is still generated and still reachable at
				// /docs/api, but it is not navigation: it is a lookup for someone
				// who already knows what they are looking for.
				{
					href: `https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/tree/master/examples`,
					position: "left" as const,
					label: "Examples",
				},
				{ type: "localeDropdown", position: "right" },
				{
					href: `https://github.com/${GITHUB_ORG}/${GITHUB_REPO}`,
					position: "right",
					className: "navbar-github",
					"aria-label": "GitHub",
				},
			],
		},
		footer: {
			style: "dark",
			links: [
				{
					title: "Documentation",
					items: [
						{ label: "Introduction", to: "/docs/intro" },
						{ label: "Installation", to: "/docs/installation" },
						{ label: "Getting started", to: "/docs/getting-started" },
						{
							label: "Examples",
							href: `https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/tree/master/examples`,
						},
					],
				},
				{
					title: "Packages",
					items: [
						{
							label: "nestwhats",
							href: "https://www.npmjs.com/package/nestwhats",
						},
						{
							label: "@nestwhats/platform-whatsapp-web.js",
							href: "https://www.npmjs.com/package/@nestwhats/platform-whatsapp-web.js",
						},
						{
							label: "@nestwhats/platform-baileys",
							href: "https://www.npmjs.com/package/@nestwhats/platform-baileys",
						},
						{
							label: "@nestwhats/dashboard",
							href: "https://www.npmjs.com/package/@nestwhats/dashboard",
						},
						{
							label: "@nestwhats/webhook",
							href: "https://www.npmjs.com/package/@nestwhats/webhook",
						},
						{
							label: "@nestwhats/locale",
							href: "https://www.npmjs.com/package/@nestwhats/locale",
						},
					],
				},
				{
					title: "More",
					items: [
						{
							label: "GitHub",
							href: `https://github.com/${GITHUB_ORG}/${GITHUB_REPO}`,
						},
						{
							label: "Issues",
							href: `https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/issues`,
						},
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} NedcloarBR. <a href="https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/blob/master/License">GPL-3.0</a> licensed.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.nightOwl,
			additionalLanguages: ["bash", "json", "diff"],
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
