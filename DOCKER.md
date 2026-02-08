# Docker Deployment Guide

This guide explains how to run the Dutch Dictation app using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and fill in your API keys:

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` and set:
- `CLAUDE_API_KEY` - Your Claude API key (required)
- `ELEVENLABS_API_KEY` - Your ElevenLabs API key (required)
- `ELEVENLABS_VOICE_ID` - Your Dutch voice ID (required)
- `CREATE_SECRET_TOKEN` - Secret token for /create access (optional)

### 2. Build and Run

```bash
# Build and start the container
docker-compose --env-file .env.docker up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at: http://localhost:3000

## Generate Secret Token

Generate a secure token for `/create` route protection:

```bash
# Option 1: Using Node directly
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using docker-compose
docker-compose --env-file .env.docker run --rm diction node scripts/generate-token.js
```

Add the generated token to `.env.docker` as `CREATE_SECRET_TOKEN`.

## Access the Create Page

Once the token is set, access the creation page at:
```
http://localhost:3000/create?token=YOUR_SECRET_TOKEN
```

## Docker Commands

### Building

```bash
# Build the image
docker-compose build

# Build without cache (force rebuild)
docker-compose build --no-cache
```

### Running

```bash
# Start in detached mode
docker-compose --env-file .env.docker up -d

# Start with logs visible
docker-compose --env-file .env.docker up

# Start and rebuild if needed
docker-compose --env-file .env.docker up -d --build
```

### Monitoring

```bash
# View logs
docker-compose logs -f diction

# Check container status
docker-compose ps

# View resource usage
docker stats diction-app

# Check health status
docker inspect --format='{{.State.Health.Status}}' diction-app
```

### Maintenance

```bash
# Restart the container
docker-compose restart

# Stop the container
docker-compose stop

# Stop and remove container (keeps image)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v

# Access container shell
docker-compose exec diction sh
```

## Docker Image Details

- **Base Image**: `node:20-alpine` (lightweight, secure)
- **User**: Runs as non-root `node` user
- **Port**: 3000 (mapped to host:3000)
- **Working Directory**: `/app`
- **Dictations Storage**: `/app/dictations` (created automatically)

## Troubleshooting

### Container won't start

Check logs for errors:
```bash
docker-compose logs diction
```

### Missing environment variables

Ensure `.env.docker` exists and contains all required variables:
```bash
cat .env.docker
```

### Permission errors

The container runs as non-root user. The dictations directory is created with proper permissions automatically.

### Health check failing

Check if the app is responding:
```bash
docker-compose exec diction wget -O- http://localhost:3000/
```

## Production Deployment

For production deployment, consider:

1. **Use a reverse proxy** (nginx, traefik) for HTTPS
2. **Set resource limits** in docker-compose.yml (already configured)
3. **Enable logging** to a centralized system
4. **Use secrets management** instead of `.env.docker` file
5. **Set up monitoring** (Prometheus, Grafana)
6. **Regular backups** of dictations if needed (though they can be regenerated)

### Example with Traefik

```yaml
services:
  diction:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.diction.rule=Host(`dictation.yourdomain.com`)"
      - "traefik.http.routers.diction.entrypoints=websecure"
      - "traefik.http.routers.diction.tls.certresolver=letsencrypt"
```

## Automatic Weekly Generation

The application includes automatic weekly dictation generation to control TTS API costs (stay within free tier).

### How It Works

- **Weekly Schedule**: Generates one dictation per week (default: Friday at 17:00 CET)
- **Topic Rotation**: Cycles through predefined topic sets (see `config/topic-pool.json`)
- **Cost Control**: Only 8 sentences per week = predictable API usage
- **Dual Mode**: Automatic generation + manual creation (via secret token) work together

### Configuration

```bash
# In .env.docker
ENABLE_AUTO_GENERATION=true
CRON_SCHEDULE=0 16 * * 5  # Every Friday at 17:00 CET (16:00 UTC)
```

### Cron Schedule Examples

**Note:** Cron runs in UTC timezone. For CET, subtract 1 hour.

```bash
0 16 * * 5   # Every Friday at 17:00 CET (default)
0 9 * * 1    # Every Monday at 10:00 CET
0 11 * * 0   # Every Sunday at 12:00 CET
0 15 * * 3   # Every Wednesday at 16:00 CET
```

### Checking Generation Status

```bash
# View logs to see generation status
docker-compose logs -f diction

# Check tracking data
docker-compose exec diction cat data/auto-generation.json
```

### Topic Customization

Edit `webapp/config/topic-pool.json` to customize weekly topics:

```json
{
  "topicSets": [
    {
      "topics": ["your-topic-1", "your-topic-2", "your-topic-3"],
      "description": "Custom theme"
    }
  ]
}
```

### Disabling Automatic Generation

To disable and use only manual creation:

```bash
# In .env.docker
ENABLE_AUTO_GENERATION=false
```

Then use the secret token URL to create dictations manually.

## Security Notes

- The container runs as non-root user `node`
- Security option `no-new-privileges` is enabled
- No volumes are mounted (all code is copied into image)
- Dictations are stored inside the container (ephemeral by design)
- Use `CREATE_SECRET_TOKEN` to protect the /create route

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAUDE_API_KEY` | Yes | - | Claude API key from Anthropic |
| `TTS_SERVICE` | No | `elevenlabs` | TTS provider (`elevenlabs` or `resemble`) |
| `ELEVENLABS_API_KEY` | If using ElevenLabs | - | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | If using ElevenLabs | - | Voice ID for Dutch voice |
| `RESEMBLE_API_KEY` | If using Resemble | - | Resemble.ai API key |
| `RESEMBLE_VOICE_UUID` | If using Resemble | - | Voice UUID from Resemble |
| `CREATE_SECRET_TOKEN` | No | - | Secret token for manual /create access |
| `ENABLE_AUTO_GENERATION` | No | `true` | Enable automatic weekly generation |
| `CRON_SCHEDULE` | No | `0 16 * * 5` | Cron schedule (default: Friday 17:00 CET) |
| `PORT` | No | `3000` | Server port (don't change in Docker) |
| `NODE_ENV` | No | `production` | Node environment |
