import { DynamicModule, Module } from "@nestjs/common";
import type { NestWhatsDashboardOptions } from "./dashboard-options.interface";
import { DASHBOARD_OPTIONS } from "./dashboard.constants";
import { DashboardService } from "./dashboard.service";

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
