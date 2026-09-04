import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const DEFAULT_DEV_FRONTEND_URL = 'http://localhost:5173';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    new Logger('Bootstrap').warn(
      `FRONTEND_URL no está definida; usando "${DEFAULT_DEV_FRONTEND_URL}" para CORS. Definila explícitamente en producción.`,
    );
  }

  app.enableCors({
    origin: frontendUrl ?? DEFAULT_DEV_FRONTEND_URL,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
