# 🐳 Docker Image Deployment Guide

## 🚀 Quick Start (Recommended)

Your Shuttle Booking app is now available as a pre-built Docker image! No need to build anything locally.

### 1. Download Deployment Files

```bash
# Create deployment directory
mkdir shuttle-booking-deploy
cd shuttle-booking-deploy

# Download the essential files (you'll need these from the repo):
# - docker-compose.prod.yml
# - nginx.conf  
# - .env.production
# - deploy-production.sh
# - ssl-setup.sh
```

### 2. Configure Environment

```bash
# Copy environment template and edit
cp .env.production .env
nano .env

# Update these important values:
# - NEXTAUTH_SECRET (generate a long random string)
# - DB_PASSWORD (strong database password)
# - PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE
# - EMAIL_USER, EMAIL_PASS
```

### 3. Set Up SSL Certificates

```bash
# Run SSL setup (make sure your domain points to this server first)
./ssl-setup.sh
```

### 4. Deploy the Application

```bash
# Deploy with pre-built image
./deploy-production.sh
```

That's it! The script will:
- Pull the latest image from GitHub Container Registry
- Start PostgreSQL database
- Run database migrations automatically
- Start Nginx with SSL termination
- Show you the status

## 📦 Available Docker Images

### GitHub Container Registry (Recommended)
```bash
docker pull ghcr.io/csteenkamp/shuttle-booking:latest
```

The image is automatically built when you push to GitHub and includes:
- ✅ Latest Next.js build
- ✅ All dependencies included
- ✅ Automatic database migrations
- ✅ Health checks
- ✅ Multi-architecture support (x64, ARM64)

## 🔧 Manual Deployment

If you prefer manual control:

```bash
# Pull the image
docker pull ghcr.io/csteenkamp/shuttle-booking:latest

# Run with database
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Building Your Own Image

If you want to build and publish your own image:

### 1. Set Up GitHub Container Registry

```bash
# Create a GitHub Personal Access Token with packages:write permission
# Then login:
docker login ghcr.io -u YOUR_GITHUB_USERNAME -p YOUR_TOKEN
```

### 2. Build and Push

```bash
# Update the username in build-push.sh
./build-push.sh
```

### 3. Set Up Automated Builds

The included GitHub Actions workflow (`.github/workflows/docker-build.yml`) will:
- Build on every push to main
- Create multi-architecture images
- Push to GitHub Container Registry
- Tag versions automatically

## 🔄 Updates

### Automatic Updates (GitHub Actions)
1. Push code changes to GitHub
2. GitHub Actions builds new image automatically
3. On your server: `./deploy-production.sh`

### Manual Updates
```bash
# Pull latest image
docker-compose -f docker-compose.prod.yml pull app

# Restart with new image
docker-compose -f docker-compose.prod.yml up -d app
```

## 📊 Monitoring

### Health Check
```bash
curl https://tjoeftjaf.xyz/api/health
```

### Container Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Just the app
docker-compose -f docker-compose.prod.yml logs -f app

# Just nginx
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🛠️ Troubleshooting

### Image Pull Issues
```bash
# Login to GitHub Container Registry
docker login ghcr.io -u YOUR_GITHUB_USERNAME -p YOUR_TOKEN

# Manually pull
docker pull ghcr.io/csteenkamp/shuttle-booking:latest
```

### Database Issues
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Access database directly
docker-compose -f docker-compose.prod.yml exec db psql -U shuttle_user shuttle_booking
```

### Application Not Starting
```bash
# Check app logs
docker-compose -f docker-compose.prod.yml logs app

# Check health endpoint
curl http://localhost:3000/api/health
```

## 🔒 Security Notes

- The image runs as non-root user `nextjs`
- Automatic database migrations run on startup
- Health checks ensure services are running properly
- All secrets should be in `.env` file (never in the image)

## 📁 Required Files for Deployment

Your deployment server only needs these files:
- `docker-compose.prod.yml` - Service orchestration
- `nginx.conf` - Reverse proxy configuration  
- `.env` - Environment variables
- `deploy-production.sh` - Deployment script
- `ssl-setup.sh` - SSL certificate setup

No source code needed on the server! 🎉