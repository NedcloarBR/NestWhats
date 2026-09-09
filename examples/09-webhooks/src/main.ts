import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.createApplicationContext(AppModule);
app.enableShutdownHooks();
