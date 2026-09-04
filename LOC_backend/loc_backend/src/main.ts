import './instrument';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DiscordService } from './discord/discord.service';

const DEFAULT_DEV_FRONTEND_URL = 'http://localhost:5173';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    new Logger('Bootstrap').warn(
      `FRONTEND_URL no está definida; usando "${DEFAULT_DEV_FRONTEND_URL}" para CORS. Definila explícitamente en producción.`,
    );
  }

  const allowedOrigins = (frontendUrl ?? DEFAULT_DEV_FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const discord = app.get(DiscordService);
  discord.notifyDeploy(
    `✅ Backend **healthy** — arrancó en \`${process.env.NODE_ENV ?? 'development'}\` (puerto ${port}).`,
  );

  app.enableShutdownHooks();
  process.on('SIGTERM', () => {
    discord.notifyDeploy(
      '🛑 Backend recibió SIGTERM — deteniéndose (deploy o escalado en curso).',
    );
  });
}
bootstrap();
