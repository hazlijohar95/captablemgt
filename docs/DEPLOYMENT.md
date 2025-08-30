# Deployment Guide

This guide provides comprehensive instructions for deploying the Cap Table Management Platform in production environments. Choose the deployment method that best fits your requirements.

## 🏗️ Deployment Options

### 1. Docker Deployment (Recommended)
- **Best for**: Most production environments
- **Complexity**: Medium
- **Scalability**: High
- **Maintenance**: Low

### 2. Cloud Provider Deployment
- **Best for**: Auto-scaling and managed services
- **Complexity**: Medium to High
- **Scalability**: Excellent
- **Maintenance**: Very Low

### 3. Traditional Server Deployment
- **Best for**: Existing infrastructure
- **Complexity**: High
- **Scalability**: Manual
- **Maintenance**: High

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.10+ and Docker Compose v2
- 4GB RAM minimum (8GB recommended)
- 10GB available disk space
- SSL certificate for production domain

### Quick Start

1. **Clone and Configure**
   ```bash
   git clone https://github.com/your-org/captable.git
   cd captable
   
   # Copy environment template
   cp docker/.env.example .env
   ```

2. **Configure Environment**
   ```bash
   # Edit .env file with your settings
   nano .env
   ```

   Required variables:
   ```env
   # Database
   DATABASE_URL=postgresql://captable:secure_password@db:5432/captable_prod
   
   # Application
   NODE_ENV=production
   PORT=3000
   
   # Security
   JWT_SECRET=your-256-bit-secret-key-here
   ENCRYPTION_KEY=your-32-char-encryption-key-here
   
   # Email (for notifications)
   SMTP_HOST=smtp.yourdomain.com
   SMTP_PORT=587
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASS=your-smtp-password
   
   # Domain
   DOMAIN=captable.yourdomain.com
   SSL_EMAIL=admin@yourdomain.com
   ```

3. **Deploy with SSL**
   ```bash
   # Production deployment with auto-SSL
   docker-compose -f docker/docker-compose.prod.yml up -d
   
   # Check status
   docker-compose logs -f app
   ```

### Docker Configuration Files

**docker/docker-compose.prod.yml**
```yaml
version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=captable_prod
      - POSTGRES_USER=captable
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**docker/Dockerfile.prod**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S captable -u 1001

# Copy built application
COPY --from=builder --chown=captable:nodejs /app/dist ./dist
COPY --from=builder --chown=captable:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=captable:nodejs /app/package*.json ./

USER captable

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]
```

### SSL Configuration

**docker/nginx.conf**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name ${DOMAIN};
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name ${DOMAIN};

        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://app/health;
        }
    }
}
```

## ☁️ Cloud Provider Deployment

### AWS Deployment

#### Using AWS ECS + RDS
```bash
# Install AWS CLI and configure
aws configure

# Create ECS cluster
aws ecs create-cluster --cluster-name captable-prod

# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier captable-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username captable \
  --master-user-password SecurePassword123 \
  --allocated-storage 20
```

**docker-compose.aws.yml**
```yaml
version: '3.8'
services:
  app:
    image: your-account.dkr.ecr.us-east-1.amazonaws.com/captable:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${RDS_DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/captable
        awslogs-region: us-east-1
```

#### AWS CDK Deployment (Advanced)
```typescript
// infrastructure/lib/captable-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class CapTableStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'CapTableVPC', {
      maxAzs: 2
    });

    // RDS PostgreSQL
    const database = new rds.DatabaseInstance(this, 'CapTableDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      databaseName: 'captable',
      credentials: rds.Credentials.fromGeneratedSecret('captable')
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'CapTableCluster', {
      vpc
    });

    // Fargate Service
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'CapTableTask', {
      memoryLimitMiB: 2048,
      cpu: 1024
    });

    // Add container
    taskDefinition.addContainer('app', {
      image: ecs.ContainerImage.fromRegistry('captable:latest'),
      environment: {
        DATABASE_URL: database.instanceEndpoint.socketAddress,
        NODE_ENV: 'production'
      },
      portMappings: [{ containerPort: 3000 }]
    });
  }
}
```

### Google Cloud Deployment

#### Using Cloud Run + Cloud SQL
```bash
# Build and push to Google Container Registry
docker build -t gcr.io/your-project/captable .
docker push gcr.io/your-project/captable

# Deploy to Cloud Run
gcloud run deploy captable \
  --image gcr.io/your-project/captable \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=$DATABASE_URL
```

### Azure Deployment

#### Using Container Instances + PostgreSQL
```bash
# Create resource group
az group create --name captable-rg --location eastus

# Create PostgreSQL server
az postgres server create \
  --resource-group captable-rg \
  --name captable-db \
  --admin-user captable \
  --admin-password SecurePassword123

# Deploy container
az container create \
  --resource-group captable-rg \
  --name captable-app \
  --image your-registry/captable:latest \
  --environment-variables DATABASE_URL=$DATABASE_URL
```

## 🖥️ Traditional Server Deployment

### Ubuntu 22.04 LTS Setup

1. **System Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl wget gnupg2 software-properties-common
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Install PostgreSQL**
   ```bash
   sudo apt install -y postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Create database and user
   sudo -u postgres psql
   CREATE DATABASE captable_prod;
   CREATE USER captable WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE captable_prod TO captable;
   \q
   ```

4. **Install Redis**
   ```bash
   sudo apt install -y redis-server
   sudo systemctl enable redis-server
   ```

5. **Deploy Application**
   ```bash
   # Create application user
   sudo useradd -m -s /bin/bash captable
   sudo su - captable
   
   # Clone and build
   git clone https://github.com/your-org/captable.git
   cd captable
   npm install
   npm run build
   
   # Configure environment
   cp .env.example .env.production
   # Edit .env.production with production settings
   ```

6. **Setup Process Manager (PM2)**
   ```bash
   npm install -g pm2
   
   # Create PM2 ecosystem file
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [{
       name: 'captable',
       script: './dist/server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   };
   EOF
   
   # Start application
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

7. **Setup Nginx Reverse Proxy**
   ```bash
   sudo apt install -y nginx
   
   # Create nginx configuration
   sudo tee /etc/nginx/sites-available/captable << EOF
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade \$http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host \$host;
           proxy_set_header X-Real-IP \$remote_addr;
           proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto \$scheme;
           proxy_cache_bypass \$http_upgrade;
       }
   }
   EOF
   
   # Enable site
   sudo ln -s /etc/nginx/sites-available/captable /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. **Setup SSL with Certbot**
   ```bash
   sudo snap install --classic certbot
   sudo certbot --nginx -d your-domain.com
   ```

## 🔧 Configuration

### Environment Variables

**Production Configuration (.env)**
```env
# Application
NODE_ENV=production
PORT=3000
DOMAIN=captable.yourdomain.com

# Database
DATABASE_URL=postgresql://captable:password@localhost:5432/captable_prod
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-256-bit-jwt-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key
SESSION_SECRET=your-session-secret-key
CSRF_SECRET=your-csrf-secret-key

# Email Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-email-password

# File Storage
UPLOAD_DIR=/var/captable/uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
SENTRY_DSN=your-sentry-dsn
HEALTH_CHECK_TOKEN=your-health-check-token

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://captable.yourdomain.com
```

### Database Configuration

**PostgreSQL Tuning (/etc/postgresql/15/main/postgresql.conf)**
```ini
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connection settings
max_connections = 100
superuser_reserved_connections = 3

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d '

# Performance
checkpoint_completion_target = 0.7
wal_buffers = 16MB
random_page_cost = 1.1
```

## 📊 Monitoring & Maintenance

### Health Checks

**Application Health Endpoint**
```typescript
// src/routes/health.ts
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    disk: await checkDiskSpace(),
    memory: process.memoryUsage()
  };
  
  const healthy = Object.values(checks).every(check => 
    typeof check === 'object' ? check.healthy : check
  );
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  });
});
```

### Monitoring Setup

**Docker with Prometheus & Grafana**
```yaml
# docker/monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

### Backup Strategy

**Automated Database Backups**
```bash
#!/bin/bash
# /opt/captable/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/captable"
DB_NAME="captable_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U captable $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# File backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/captable/uploads

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-backup-bucket/
```

**Cron Job Setup**
```bash
# Add to crontab
0 2 * * * /opt/captable/backup.sh >> /var/log/captable-backup.log 2>&1
```

## 🔒 Security Hardening

### Firewall Configuration
```bash
# Ubuntu UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL Configuration
```nginx
# Enhanced SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connections
   sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
   
   # Restart if needed
   sudo systemctl restart postgresql
   ```

2. **High Memory Usage**
   ```bash
   # Check application memory
   pm2 monit
   
   # Check database memory
   sudo -u postgres psql -c "SELECT * FROM pg_stat_database;"
   ```

3. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew if needed
   sudo certbot renew --dry-run
   ```

### Performance Optimization

**Database Indexing**
```sql
-- Essential indexes for performance
CREATE INDEX idx_stakeholders_company_id ON stakeholders(company_id);
CREATE INDEX idx_securities_stakeholder_id ON securities(stakeholder_id);
CREATE INDEX idx_vesting_schedules_security_id ON vesting_schedules(security_id);
```

**Application Caching**
```typescript
// Redis caching for expensive calculations
const calculateWaterfallCached = async (scenarioId: string) => {
  const cacheKey = `waterfall:${scenarioId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await calculateWaterfall(scenarioId);
  await redis.setex(cacheKey, 3600, JSON.stringify(result));
  
  return result;
};
```

---

For additional deployment assistance or enterprise deployment consulting, please contact our support team or create an issue in the repository.