# Deploying to Koyeb

This guide will help you deploy your NestJS backend to Koyeb.

## Prerequisites

1. A Koyeb account (sign up at https://www.koyeb.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. MongoDB database (MongoDB Atlas recommended)
4. Redis instance (Upstash Redis recommended)

## Step 1: Prepare Your Environment Variables

Your application requires the following environment variables:

- `MONGODB_URI` - MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/dbname`)
- `REDIS_URL` - Redis connection URL (e.g., `rediss://default:password@host.upstash.io:6379`)
- `JWT_SECRET` - Secret key for JWT token signing (use a strong random string)
- `PORT` - Port number (Koyeb sets this automatically, but defaults to 3000)
- `FRONTEND_URL` - Your frontend URL for CORS (e.g., `https://your-frontend.vercel.app`)
- `NODE_ENV` - Set to `production`

## Step 2: Deploy via Koyeb Dashboard

### Option A: Deploy from Git Repository (Recommended)

1. **Log in to Koyeb**
   - Go to https://app.koyeb.com
   - Sign in or create an account

2. **Create a New App**
   - Click "Create App" button
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Koyeb to access your repositories
   - Select your repository: `movie-theatre-be`
   - Select the branch: `main` (or your default branch)

3. **Configure Build Settings**
   - **Build Command**: Leave empty (Dockerfile handles this)
   - **Run Command**: Leave empty (Dockerfile handles this)
   - **Dockerfile Path**: `backend/Dockerfile` (if repo root is parent directory) or `Dockerfile` (if repo root is backend)
   - **Docker Build Context**: `backend` (if repo root is parent directory) or `.` (if repo root is backend)

4. **Set Environment Variables**
   Click "Environment Variables" and add:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
   REDIS_URL=rediss://default:password@host.upstash.io:6379
   JWT_SECRET=your-very-secure-random-secret-key-here
   FRONTEND_URL=https://your-frontend-domain.com
   NODE_ENV=production
   ```

5. **Deploy**
   - Click "Deploy" button
   - Wait for the build to complete (usually 2-5 minutes)
   - Your app will be available at `https://your-app-name.koyeb.app`

### Option B: Deploy via Koyeb CLI

1. **Install Koyeb CLI**
   ```bash
   curl -fsSL https://www.koyeb.com/cli | sh
   ```

2. **Login to Koyeb**
   ```bash
   koyeb login
   ```

3. **Create and Deploy App**
   ```bash
   cd backend
   koyeb app create movie-theatre-backend
   koyeb service create movie-theatre-backend \
     --app movie-theatre-backend \
     --dockerfile Dockerfile \
     --docker-build-context . \
     --env MONGODB_URI="your-mongodb-uri" \
     --env REDIS_URL="your-redis-url" \
     --env JWT_SECRET="your-jwt-secret" \
     --env FRONTEND_URL="https://your-frontend.com" \
     --env NODE_ENV="production"
   ```

## Step 3: Set Up MongoDB Atlas (If Not Already Done)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Whitelist IP addresses (use `0.0.0.0/0` for Koyeb or add Koyeb's IP ranges)
5. Get your connection string and use it as `MONGODB_URI`

## Step 4: Set Up Upstash Redis (If Not Already Done)

1. Go to https://upstash.com
2. Create a Redis database
3. Copy the Redis URL (it will be in `rediss://` format for TLS)
4. Use it as your `REDIS_URL` environment variable

## Step 5: Verify Deployment

1. Check your app logs in Koyeb dashboard
2. Test your API endpoints:
   ```bash
   curl https://your-app-name.koyeb.app/health
   ```
3. Verify environment variables are set correctly in Koyeb dashboard

## Step 6: Set Up Custom Domain (Optional)

1. In Koyeb dashboard, go to your app → Settings → Domains
2. Click "Add Domain"
3. Follow the instructions to configure your DNS
4. Update your `FRONTEND_URL` environment variable if needed

## Troubleshooting

### Build Fails
- Check build logs in Koyeb dashboard
- Ensure Dockerfile is in the correct location
- Verify all dependencies are in `package.json`

### App Crashes on Start
- Check runtime logs in Koyeb dashboard
- Verify all environment variables are set correctly
- Ensure MongoDB and Redis are accessible from Koyeb's network

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes Koyeb IPs
- Check MongoDB connection string format
- Ensure database user has correct permissions

### Redis Connection Issues
- Verify Redis URL format (should use `rediss://` for Upstash)
- Check Redis credentials
- Ensure Redis instance is running

## Health Check Endpoint

The Dockerfile includes a health check. You may want to add a health endpoint to your app:

```typescript
// In your main.ts or a health controller
@Get('health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

## Continuous Deployment

Koyeb automatically deploys when you push to your connected branch. To disable:
- Go to App Settings → Source → Disable "Auto Deploy"

## Monitoring

- View logs: Koyeb Dashboard → Your App → Logs
- View metrics: Koyeb Dashboard → Your App → Metrics
- Set up alerts: Koyeb Dashboard → Your App → Alerts

## Cost Optimization

- Koyeb offers a free tier with limitations
- Consider using Koyeb's Starter plan for production workloads
- Monitor resource usage in the dashboard
