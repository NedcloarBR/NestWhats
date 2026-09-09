import { ParamData } from "@nestjs/common";
import { ParamsFactory } from "@nestjs/core/helpers/external-context-creator.js";
import { NestWhatsBaseDiscovery } from "./base.discovery.js";
import { NestWhatsParamType } from "./paramtype.enum.js";

/** Resolves NestWhats parameter decorators to their values at call time. */
export class NestWhatsParamsFactory implements ParamsFactory {
	public exchangeKeyForValue(
		type: number,
		// Part of Nest's `ParamsFactory` signature. None of our decorators take
		// data, so the position has to stay and the value is never read.
		_data: ParamData,
		args: [Array<any>, NestWhatsBaseDiscovery],
	): any {
		if (!args) return null;

		switch (type as NestWhatsParamType) {
			case NestWhatsParamType.CONTEXT:
				return args[0];
			case NestWhatsParamType.DISCOVERY:
				return args[1];
			default:
				return null;
		}
	}
}
