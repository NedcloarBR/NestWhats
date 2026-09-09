import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import useBaseUrl from "@docusaurus/useBaseUrl";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import TabItem from "@theme/TabItem";
import Tabs from "@theme/Tabs";
import type { ReactNode } from "react";
import styles from "./index.module.css";

const MODULE = `@Module({
  imports: [
    NestWhatsModule.forRoot({
      // Every platform this application can talk on.
      adapters: [WhatsAppWebJsAdapterFactory, BaileysAdapterFactory],
      // One client per connected number, on whichever platform suits it.
      clients: [
        new NestWhatsClientConfig(WhatsAppWebJsAdapterFactory, { name: 'support' }),
        new NestWhatsClientConfig(BaileysAdapterFactory, { name: 'alerts' }),
      ],
    }),
  ],
})
export class AppModule {}`;

const HANDLER = `@Injectable()
export class AppHandler {
  // A command is a message that starts with the client's prefix.
  @Command({ name: 'ping', description: 'Answers with pong' })
  public async onPing(@Message() message: NestWhatsMessage) {
    await message.reply('pong');
  }
}`;

const MODERATION = `@Injectable()
export class ModerationHandler {
  // Guards decide who may run it, pipes parse what follows the word.
  @Command({ name: 'kick', description: 'Removes someone from the group' })
  @UseGuards(GroupOnlyGuard, IsAdminGuard)
  public async onKick(@Chat() chatId: string, @Arguments(ParseArgs) { user }: KickDto) {
    const chat = await this.client.getChat(chatId);
    await chat?.removeParticipants?.([user]);
  }
}`;

const LISTENER = `@Injectable()
export class AppListener {
  @Once('qr')
  public onQr(@Context() [client, qr]: ContextOf<'qr'>) {
    this.logger.log(\`Scan this to connect \${client.name}: \${qr}\`);
  }

  @On('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(\`\${client.name} is online\`);
  }
}`;

const SERVICE = `@Injectable()
export class AlertService {
  public constructor(
    @InjectClient('alerts') private readonly client: NestWhatsClient,
  ) {}

  // Sending needs no handler: a connected number is a provider like any other.
  public async warn(chatId: string, text: string) {
    await this.client.sendMessage(chatId, text);
  }
}`;

/**
 * WhatsApp's delivery ticks, the shape everyone already reads without being
 * told. The library models the same states as `MessageStatus`, so this is the
 * subject's own vocabulary rather than an illustration of it.
 */
function Ticks(): ReactNode {
	return (
		<svg
			className={styles.ticks}
			viewBox="0 0 20 12"
			aria-hidden="true"
			focusable="false"
		>
			<path
				className={styles.tickFirst}
				d="M1 6.5 4.2 9.8 10.6 2"
				fill="none"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				className={styles.tickSecond}
				d="M8.4 6.5 11.6 9.8 18 2"
				fill="none"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** A library's own mark and name, linking to the library's own site. */
function Lib({
	name,
	icon,
	href,
}: {
	name: string;
	icon: string;
	href: string;
}): ReactNode {
	return (
		<Link className={styles.lib} href={href}>
			<img className={styles.libIcon} src={useBaseUrl(icon)} alt="" />
			{name}
		</Link>
	);
}

/**
 * What actually exists, and nothing else. An adapter for the official Cloud API
 * is a design target the contract was shaped around — it is why the mandatory
 * block is small — but it is not written, and listing it here would be
 * advertising something nobody can install.
 */
const PLATFORMS = [
	{
		name: "whatsapp-web.js",
		icon: "img/platforms/whatsapp-web-js.png",
		href: "https://wwebjs.dev/",
		docs: "/docs/platforms/whatsapp-web-js",
		note: (
			<Translate id="home.platforms.wwjs">
				A real WhatsApp Web session in a headless browser. Widest feature set,
				about a gigabyte of memory per client.
			</Translate>
		),
	},
	{
		name: "Baileys",
		icon: "img/platforms/baileys.png",
		href: "https://baileys.wiki/",
		docs: "/docs/platforms/baileys",
		note: (
			<Translate id="home.platforms.baileys">
				A WebSocket connection with no browser. Sessions cost megabytes, and it
				reaches status, presence, communities and channels.
			</Translate>
		),
	},
];

/** The packages and features a reader would otherwise only find in the sidebar. */
const EXTRAS = [
	{
		to: "/docs/packages/dashboard",
		name: "Dashboard",
		note: (
			<Translate id="home.extras.dashboard">
				Watch connections, scan a QR and create clients while the app runs.
			</Translate>
		),
	},
	{
		to: "/docs/packages/webhook",
		name: "Webhooks",
		note: (
			<Translate id="home.extras.webhook">
				Bind and unbind listeners at runtime, per client.
			</Translate>
		),
	},
	{
		to: "/docs/packages/locale",
		name: "i18n",
		note: (
			<Translate id="home.extras.locale">
				Reply in the language of whoever is writing.
			</Translate>
		),
	},
	{
		to: "/docs/advanced/connection",
		name: "Reconnection",
		note: (
			<Translate id="home.extras.connection">
				Backoff by disconnect reason, and a health check for Terminus.
			</Translate>
		),
	},
];

export default function Home(): ReactNode {
	return (
		<Layout
			title={translate({
				id: "home.meta.title",
				message: "WhatsApp for NestJS applications",
			})}
			description={translate({
				id: "home.meta.description",
				message:
					"A NestJS framework for WhatsApp: send and receive messages with decorators, dependency injection, guards and pipes, over one adapter contract.",
			})}
		>
			<main>
				<section className={styles.hero}>
					<div className={styles.heroInner}>
						<div className={styles.brand}>
							<img
								className={styles.brandMark}
								src={useBaseUrl("img/logo.svg")}
								alt=""
							/>
							NestWhats
						</div>
						<h1 className={styles.title}>
							<Translate
								id="home.hero.title"
								values={{
									whatsapp: (
										<span className={styles.whatsapp}>
											<Translate id="home.hero.title.whatsapp">
												WhatsApp
											</Translate>
										</span>
									),
									nest: (
										<span className={styles.nest}>
											<Translate id="home.hero.title.nest">NestJS</Translate>
										</span>
									),
								}}
							>
								{"The best way to work with {whatsapp} in {nest}"}
							</Translate>
						</h1>

						<p className={styles.lede}>
							<Translate
								id="home.hero.lede"
								values={{
									wwjs: (
										<Lib
											name="whatsapp-web.js"
											icon="img/platforms/whatsapp-web-js.png"
											href="https://wwebjs.dev/"
										/>
									),
									baileys: (
										<Lib
											name="Baileys"
											icon="img/platforms/baileys.png"
											href="https://baileys.wiki/"
										/>
									),
									nest: (
										<Lib
											name="NestJS"
											icon="img/platforms/nestjs.svg"
											href="https://nestjs.com/"
										/>
									),
								}}
							>
								{
									"This package uses the best of the Node world under the hood. {wwjs} and {baileys} hold the connection to WhatsApp, and {nest} is a progressive framework for building well-architected applications. Use it for a bot, for the messages a product has to send, or for anything in between."
								}
							</Translate>
						</p>

						{/* Three doors, the way every framework's front page has: start
						    reading, look something up, or read the source. */}
						<div className={styles.actions}>
							<Link className={styles.primaryAction} to="/docs/getting-started">
								<Translate id="home.hero.start">Get started</Translate>
							</Link>
							<Link
								className={styles.secondaryAction}
								to="/docs/platforms/overview"
							>
								<Translate id="home.hero.platforms">Platforms</Translate>
							</Link>
							<Link
								className={styles.secondaryAction}
								href="https://github.com/NedcloarBR/nestwhats/tree/master/examples"
							>
								<Translate id="home.hero.examples">Examples</Translate>
							</Link>
							<Link
								className={styles.secondaryAction}
								href="https://github.com/NedcloarBR/nestwhats"
							>
								<Translate id="home.hero.github">GitHub</Translate>
							</Link>
						</div>

						{/* The real command: the core alone connects to nothing, so
						    showing it without a platform would send people to an error. */}
						<p className={styles.installLabel}>
							<Translate id="home.hero.install">
								or install it with your package manager:
							</Translate>
						</p>
						<div className={styles.install}>
							<CodeBlock language="bash">
								npm install nestwhats @nestwhats/platform-whatsapp-web.js
							</CodeBlock>
						</div>
					</div>

					{/* One panel: the code, and — for the handler that produces one —
					    the conversation it produces. Tabs are named after the file, so
					    the set reads as one small application rather than four
					    unrelated snippets. */}
					{/* One panel: how the module is wired, then what that buys you.
					    Tabs are named after the file, so the set reads as one small
					    application rather than five unrelated snippets. */}
					<div className={styles.demo}>
						<div className={styles.chrome} aria-hidden="true">
							<span />
							<span />
							<span />
						</div>
						<Tabs groupId="home-demo">
							<TabItem value="module" label="app.module.ts" default>
								<CodeBlock language="typescript" showLineNumbers>
									{MODULE}
								</CodeBlock>
								<p className={styles.demoNote}>
									<Translate id="home.demo.note.module">
										One application holds as many numbers as you declare, on as
										many platforms, each injectable by name.
									</Translate>
								</p>
							</TabItem>

							<TabItem value="handler" label="app.handler.ts">
								<CodeBlock language="typescript" showLineNumbers>
									{HANDLER}
								</CodeBlock>

								<div className={styles.thread} aria-hidden="true">
									<div className={styles.bubbleIn}>
										!ping
										<span className={styles.meta}>09:41</span>
									</div>
									<div className={styles.bubbleOut}>
										pong
										<span className={styles.meta}>
											09:41
											<Ticks />
										</span>
									</div>
								</div>
							</TabItem>

							<TabItem value="moderation" label="moderation.handler.ts">
								<CodeBlock language="typescript" showLineNumbers>
									{MODERATION}
								</CodeBlock>
								<p className={styles.demoNote}>
									<Translate id="home.demo.note.moderation">
										Nest guards and pipes run around a command the way they run
										around a route.
									</Translate>
								</p>
							</TabItem>

							<TabItem value="listener" label="app.listener.ts">
								<CodeBlock language="typescript" showLineNumbers>
									{LISTENER}
								</CodeBlock>
								<p className={styles.demoNote}>
									<Translate id="home.demo.note.listener">
										Every event carries the client it came from, typed by the
										name you listen to.
									</Translate>
								</p>
							</TabItem>

							<TabItem value="service" label="alert.service.ts">
								<CodeBlock language="typescript" showLineNumbers>
									{SERVICE}
								</CodeBlock>
								<p className={styles.demoNote}>
									<Translate id="home.demo.note.service">
										A client is an injectable service, so anything in the
										application can send — no handler involved.
									</Translate>
								</p>
							</TabItem>
						</Tabs>
					</div>
				</section>

				<section className={styles.platforms}>
					<div className={styles.platformsInner}>
						<h2 className={styles.sectionTitle}>
							<Translate id="home.platforms.title">
								Your code stays. The platform underneath does not.
							</Translate>
						</h2>
						<p className={styles.sectionLede}>
							<Translate id="home.platforms.lede">
								The core defines the contract; a platform package connects to an
								actual WhatsApp library. Swapping one for another does not touch
								the code that uses it.
							</Translate>
						</p>

						<ul className={styles.platformList}>
							{PLATFORMS.map((platform) => (
								<li key={platform.name} className={styles.platform}>
									<Lib
										name={platform.name}
										icon={platform.icon}
										href={platform.href}
									/>
									<p className={styles.platformNote}>{platform.note}</p>
									<Link className={styles.platformDocs} to={platform.docs}>
										<Translate id="home.platforms.guide">
											Read the guide
										</Translate>
									</Link>
								</li>
							))}
						</ul>

						<p className={styles.sectionNote}>
							<Translate id="home.platforms.note">
								Platforms differ in what they can do, so a client tells you
								instead of failing when you call.
							</Translate>{" "}
							<Link to="/docs/core/capabilities">
								<Translate id="home.platforms.link">
									How capabilities work
								</Translate>
							</Link>
						</p>
					</div>
				</section>

				{/* The page used to stop at the platform list, which left the rest of
				    the framework discoverable only through the sidebar. */}
				<section className={styles.extras}>
					<div className={styles.extrasInner}>
						<h2 className={styles.sectionTitle}>
							<Translate id="home.extras.title">Also in the box</Translate>
						</h2>
						<ul className={styles.extrasList}>
							{EXTRAS.map((extra) => (
								<li key={extra.to}>
									<Link to={extra.to} className={styles.extra}>
										<span className={styles.extraName}>{extra.name}</span>
										<span className={styles.extraNote}>{extra.note}</span>
									</Link>
								</li>
							))}
						</ul>
					</div>
				</section>
			</main>
		</Layout>
	);
}
