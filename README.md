<p align="center">
  <img src="https://raw.githubusercontent.com/Flutry-HQ/flutry/main/assets/logo.png" alt="Flurty logo" width="180">
</p>

Flutry is a modern, modular TypeScript backend application built with the Fastify framework.

## HTTP rate limiting

The starter includes an optional global fixed-window limit, disabled by default:

```env
RATE_LIMIT_ENABLED=false
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60
RATE_LIMIT_REDIS=false
RATE_LIMIT_NAME=flutry:global
```

Set RATE_LIMIT_ENABLED=true to admit RATE_LIMIT_MAX requests per IP in each
RATE_LIMIT_WINDOW-second window. Numeric values must be positive safe integers,
and the window must be safely representable in milliseconds. Invalid numeric
settings are rejected at startup, including when disabled.

Memory mode needs no Redis package or server. Its quotas belong to one process
and are not shared across workers or VPS instances. For distributed quotas,
install the updated `@flutry/redis` companion package and configure:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS=true
RATE_LIMIT_NAME=my-app:global
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_PREFIX=my-app:
```

Use identical names and settings on replicas and different names/prefixes for
unrelated applications. Keep real credentials out of Git. Redis is acquired only
when limiting is enabled in Redis mode. Readiness waits for Redis; failures prevent
startup or return HTTP 503 without falling back to memory. Shutdown releases Redis
owned by limiting while preserving the existing database shutdown path.

Health and favicon paths are excluded by default, as is the configured Socket.IO
transport path. IP identification follows the existing trustProxy setting. The
starter defaults to false; configure explicit trusted proxies for your ingress.

Responses include RateLimit-Limit, RateLimit-Remaining, and RateLimit-Reset. Reset
is relative seconds rounded up, not a timestamp. Exceeded quotas return HTTP 429
and Retry-After in seconds. Storage/capacity failures return 503.

Create a reusable route-specific limit outside the handler:

```ts
import { RateLimit, Router } from '@flutry/server';

const limit = new RateLimit({ max: 5, window: 60, redis: false });

export default class LoginRoute extends Router {
  constructor() {
    super();
    this.post('/', async (ctx) => {
      await limit.handle(ctx);
      return ctx.send({ message: 'Continue authentication here' });
    });
  }
}
```

Blocked checks throw and stop subsequent code. Global and route rules are
independent and count each request once per rule. Custom synchronous/asynchronous
keyGenerator callbacks receive Flutry's context; ctx.req is the Fastify request.
Redis route rules need a stable name and should register connect() and close()
with onReady and onClose. See the server README for all options and examples.

## License

This project is licensed under the Apache license.
