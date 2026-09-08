import { DynamicModule, Module } from "@nestjs/common";
import { DASHBOARD_OPTIONS } from "./dashboard.constants.js";
import { DashboardService } from "./dashboard.service.js";
import type { NestWhatsDashboardOptions } from "./dashboard-options.interface.js";

/**
 * Serves the live dashboard: client status, QR codes and pairing codes, and
 * creating, editing and destroying virtual clients.
 *
 * ```typescript
 * NestWhatsDashboardModule.forRoot({ port: 4000, path: 'nestwhats' })
 * ```
 */
@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: forRoot pattern matches NestWhatsModule convention
export class NestWhatsDashboardModule {
	public static forRoot(
		options: NestWhatsDashboardOptions = {},
	): DynamicModule {
		return {
			module: NestWhatsDashboardModule,
			providers: [
				{ provide: DASHBOARD_OPTIONS, useValue: options },
				DashboardService,
			],
		};
	}
}
