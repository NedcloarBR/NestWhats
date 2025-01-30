import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestWhatsModule } from "../src";

@Module({
	imports: [NestWhatsModule.forRoot({})],
})
class AppModule {}

async function bootstrap() {
	const app = await NestFactory.createApplicationContext(AppModule);
	await app.init();
}
bootstrap();
