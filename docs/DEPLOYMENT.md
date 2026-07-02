# Deployment

## Container build

Both apps build to minimal runtime images via multi-stage Dockerfiles that use
`turbo prune` to isolate each app and its dependencies.

```bash
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

Services:

| Service  | Image                | Purpose                  |
| -------- | -------------------- | ------------------------ |
| postgres | postgres:16-alpine   | Primary datastore        |
| redis    | redis:7-alpine       | Cache / sessions         |
| backend  | built from source    | NestJS API               |
| frontend | built from source    | Next.js (standalone)     |
| nginx    | nginx:1.27-alpine    | Reverse proxy / gateway  |

## Environments

Configuration is layered: the base `.env` is always loaded, then the matching
`.env.<NODE_ENV>` overrides it. Real secrets are injected by the platform and
never committed.

| Environment | NODE_ENV     | Notes                                    |
| ----------- | ------------ | ---------------------------------------- |
| Development | development  | Swagger on, verbose logs, insecure cookie|
| Staging     | staging      | Swagger on, info logs, secure cookies    |
| Production  | production   | Swagger off, warn logs, secure cookies   |

The backend validates its environment with Zod at boot and refuses to start on
invalid configuration.

## Health & probes

| Endpoint                      | Use                          |
| ----------------------------- | ---------------------------- |
| `/api/v1/health`              | Full readiness (db, cache)   |
| `/api/v1/health/liveness`     | Liveness probe               |
| `/api/v1/health/readiness`    | Readiness probe              |

Use these for Kubernetes/Swarm liveness and readiness probes.

## Scaling notes

- Backend is stateless — scale horizontally behind the proxy.
- Socket.IO requires sticky sessions or a Redis adapter when running multiple
  backend replicas (the Redis service is already provisioned).
- Run `prisma migrate deploy` as a release step once models exist.
