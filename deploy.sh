#!/usr/bin/env bash
set -e

# ProjektLLM — deploy to homeserver via rsync
# Usage: ./deploy.sh user@homeserver-ip

HOST="$1"
DOMAIN="$2"
if [ -z "$HOST" ] || [ -z "$DOMAIN" ]; then
  echo "Usage: $0 user@homeserver-ip your-domain.com"
  echo "Example: $0 root@192.168.1.100 projektllm.yourdomain.com"
  exit 1
fi

DIR="projektllm"

# Copy project files
echo "==> Copying project to $HOST:$DIR ..."
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.claude' \
  --exclude='backend/static/assets' \
  --exclude='backend/uploads/*' \
  --exclude='*.db' \
  --exclude='.env' \
  --exclude='.env.local' \
  ./ "$HOST:$DIR/"

# Generate env and deploy on server
ssh "$HOST" << DEPLOY
cd "$DIR"

# Create .env
cat > .env << EOF
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 48)
EOF

echo "Created .env with secure credentials"

# Build and start
echo "==> Building Docker image..."
docker compose build

echo "==> Starting..."
docker compose up -d

echo "==> Waiting for health check..."
sleep 3
curl -sf http://localhost:8000/api/settings > /dev/null 2>&1 && echo "OK" || echo "Still starting..."

echo ""
echo "========================"
echo "  Deploy complete!"
echo "========================"
echo ""
echo "  Local:     http://localhost:8000"
echo "  Login:     admin / see .env for password"
echo ""
echo "  Next: set up Cloudflare Tunnel:"
echo "  1. cloudflared tunnel login"
echo "  2. cloudflared tunnel create projektllm"
echo "  3. cloudflared tunnel route dns projektllm $DOMAIN"
echo "  4. cloudflared tunnel run projektllm"
echo ""
echo "  Or add to docker-compose.yml:"
echo "  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/"
DEPLOY
