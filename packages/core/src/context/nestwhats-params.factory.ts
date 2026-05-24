import { ParamData } from "@nestjs/common";
import { ParamsFactory } from "@nestjs/core/helpers/external-context-creator";
import { NestWhatsBaseDiscovery } from "./nestwhats-base.discovery";
import { NestWhatsParamType } from "./nestwhats-paramtype.enum";

export class NestWhatsParamsFactory implements ParamsFactory {
	public exchangeKeyForValue(
		type: number,
		data: ParamData,
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
