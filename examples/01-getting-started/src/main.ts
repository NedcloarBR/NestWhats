import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.createApplicationContext(AppModule);

// Closes the browser and the WhatsApp session on Ctrl+C. Without it the
// process dies with a session still open.
app.enableShutdownHooks();
