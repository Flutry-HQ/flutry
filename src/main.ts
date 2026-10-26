import 'dotenv/config';

import { Connect, type DatabaseDialect } from '@flutry/database-sequlize';
import { HttpServer } from '@flutry/server';

const server = new HttpServer({
  trustProxy: false,
  logger: false,
  compression: true,
  helmet: true,
  prefix: process.env.PREFIX_API ?? '/',
  socket: false,
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    window: Number(process.env.RATE_LIMIT_WINDOW ?? 60),
    redis: process.env.RATE_LIMIT_REDIS === 'true',
    name: process.env.RATE_LIMIT_NAME ?? 'flutry:global',
  },
});

let database: Connect | undefined;
let stopping: Promise<void> | undefined;

async function shutdown(): Promise<void> {
  if (stopping) return stopping;

  stopping = (async () => {
    try {
      await server.close();
    } finally {
      await database?.close();
    }
  })();

  return stopping;
}

async function bootstrap(): Promise<void> {
  try {
    if (process.env.DB === 'true') {
      database = new Connect({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 3306),
        database: process.env.DB_NAME ?? 'flutry',
        username: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASS ?? '',
        dialect: (process.env.DB_DIALECT as DatabaseDialect) ?? 'mariadb',
      });

      await database.ready;
    }

    await server.listen(Number(process.env.PORT ?? 1337), process.env.HOST ?? '0.0.0.0');
  } catch (error) {
    console.error('Application startup failed:', error);
    await shutdown();
    process.exitCode = 1;
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown()
      .then(() => {
        process.exitCode = 0;
      })
      .catch((error) => {
        console.error('Shutdown failed:', error);
        process.exitCode = 1;
      });
  });
}

void bootstrap();
