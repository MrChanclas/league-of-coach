import './instrument';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getAllowedOrigins } from './common/allowed-origins';
import { TRUSTED_PROXY_HOPS } from './common/rate-limit';
import { DiscordService } from './discord/discord.service';

// How long browsers reuse a CORS preflight (Chromium caps it at two hours).
// Every call carries an Authorization header, so without this nearly each one
// pays an extra round trip to the API first.
const CORS_PREFLIGHT_MAX_AGE_SECONDS = 2 * 60 * 60;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', TRUSTED_PROXY_HOPS);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  if (!process.env.FRONTEND_URL) {
    new Logger('Bootstrap').warn(
      'FRONTEND_URL no está definida; usando localhost para CORS. Defínela explícitamente en producción.',
    );
  }

  app.enableCors({
    origin: getAllowedOrigins(),
    maxAge: CORS_PREFLIGHT_MAX_AGE_SECONDS,
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
// Sin el catch, un fallo al arrancar (puerto ocupado, base inalcanzable)
// terminaba como unhandled rejection: Node mata el proceso igual, pero sin
// decir qué pasó, que es lo único útil cuando el contenedor no levanta.
bootstrap().catch((error) => {
  new Logger('Bootstrap').error(`El backend no pudo arrancar: ${error}`);
  process.exit(1);
});
