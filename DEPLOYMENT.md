# 🚀 Shuttle Booking App - Docker Deployment Guide

## 📋 Prerequisites

1. **Server Requirements:**
   - Linux server (Ubuntu 20.04+ recommended)
   - Docker and Docker Compose installed
   - 2GB+ RAM
   - 10GB+ storage
   - Public IP address

2. **Domain Setup:**
   - Domain `tjoeftjaf.xyz` pointing to your server's IP
   - Both A records: `tjoeftjaf.xyz` and `www.tjoeftjaf.xyz`

3. **Network Configuration:**
   - Port 80 (HTTP) open for Let's Encrypt
   - Port 443 (HTTPS) open for web traffic
   - Router port forwarding configured

## 🔧 Installation Steps

### 1. Install Docker and Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

### 2. Clone/Upload Your Project
```bash
# If using git:
git clone <your-repo-url> shuttle-booking
cd shuttle-booking

# Or upload your project files to the server
```

### 3. Configure Environment Variables
```bash
# Copy the production environment template
cp .env.production .env

# Edit with your values
nano .env
```

**Important variables to update:**
- `NEXTAUTH_SECRET` - Generate a secure random string
- `DB_PASSWORD` - Set a strong database password
- `PAYFAST_MERCHANT_ID` - Your PayFast merchant ID
- `PAYFAST_MERCHANT_KEY` - Your PayFast merchant key
- `PAYFAST_PASSPHRASE` - Your PayFast passphrase
- `PAYFAST_SANDBOX` - Set to `false` for production
- `CRON_SECRET` - Generate a secure random string

### 4. Set Up SSL Certificates
```bash
# Run the SSL setup script
./ssl-setup.sh
```

This will:
- Create Let's Encrypt SSL certificates
- Verify your domain
- Set up automatic certificate renewal

### 5. Deploy the Application
```bash
# Run the deployment script
./deploy.sh
```

This will:
- Build Docker images
- Start all services (app, database, nginx)
- Run database migrations
- Show container status

## 🔍 Verification

1. **Check container status:**
   ```bash
   docker-compose ps
   ```

2. **View application logs:**
   ```bash
   docker-compose logs -f app
   ```

3. **Test the application:**
   - Visit `https://tjoeftjaf.xyz`
   - Try creating an account
   - Test the booking system

## 📊 Production Configuration

### PayFast Setup
1. Log into your PayFast merchant account
2. Update your webhook URLs:
   - Return URL: `https://tjoeftjaf.xyz/credits/success`
   - Cancel URL: `https://tjoeftjaf.xyz/credits/cancel`
   - Notify URL: `https://tjoeftjaf.xyz/api/payments/webhook`
3. Set `PAYFAST_SANDBOX=false` in your `.env`

### Database Backups
```bash
# Create backup
docker-compose exec db pg_dump -U shuttle_user shuttle_booking > backup.sql

# Restore backup
docker-compose exec -i db psql -U shuttle_user shuttle_booking < backup.sql
```

### SSL Certificate Renewal
Certificates auto-renew, but to manually renew:
```bash
docker-compose exec certbot certbot renew
docker-compose restart nginx
```

## 🛠️ Maintenance Commands

```bash
# View all logs
docker-compose logs -f

# Restart just the app
docker-compose restart app

# Update the application
git pull origin main  # if using git
./deploy.sh

# Stop everything
docker-compose down

# Start everything
docker-compose up -d

# Access database
docker-compose exec db psql -U shuttle_user shuttle_booking
```

## 🔒 Security Checklist

- [ ] Strong passwords set for all services
- [ ] SSL certificates installed and working
- [ ] PayFast production credentials configured
- [ ] Regular backups scheduled
- [ ] Server firewall configured
- [ ] Domain DNS properly configured
- [ ] Rate limiting enabled in Nginx

## 🆘 Troubleshooting

### Domain not working
- Check DNS propagation: `nslookup tjoeftjaf.xyz`
- Verify A records point to your server's IP
- Check port forwarding on your router

### SSL certificate issues
- Ensure port 80 is accessible from the internet
- Check domain DNS settings
- Re-run `./ssl-setup.sh`

### Application errors
```bash
# Check app logs
docker-compose logs app

# Check database connection
docker-compose exec app npx prisma db pull

# Restart services
docker-compose restart
```

### PayFast webhook issues
- Check webhook URLs in PayFast dashboard
- Verify `PAYFAST_NOTIFY_URL` in `.env`
- Check application logs for webhook errors

## 📞 Support

For issues with:
- **App functionality**: Check application logs
- **PayFast integration**: Contact PayFast support
- **SSL certificates**: Check Let's Encrypt documentation
- **Server setup**: Contact your hosting provider