import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // autoriser les requêtes cross-origin (utile pour demo.html servie sur un port différent)
  app.enableCors();
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
