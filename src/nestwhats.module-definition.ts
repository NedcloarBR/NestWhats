import { ConfigurableModuleBuilder } from "@nestjs/common";
import { NestWhatsModuleOptions } from "./nestwhats-options.interface";

export const {
	ConfigurableModuleClass,
	MODULE_OPTIONS_TOKEN: NESTWHATS_MODULE_OPTIONS,
	OPTIONS_TYPE,
	ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<NestWhatsModuleOptions>()
	.setClassMethodName("forRoot")
	.setFactoryMethodName("createNestWhatsOptions")
	.build();
