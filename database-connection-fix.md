# Database Connection Troubleshooting Guide

This guide helps you fix database connection issues that prevent login.

## Symptoms

- Login fails with "Invalid credentials" even with correct email/password
- Login takes 10+ seconds before failing
- Console logs show: `Can't reach database server at...`
- Error message: "Database connection failed"

## Root Cause

The `DATABASE_URL` in your `.env` file is pointing to a database that cannot be reached.

## Solution Options

### Option 1: Fix Supabase Connection (if using Supabase)

1. **Check your Supabase project status**:
   - Go to https://supabase.com/dashboard/projects
   - Ensure your project is **Active** (not Paused)
   - If paused, restore it

2. **Get the correct connection string**:
   - In Supabase dashboard, go to **Project Settings** > **Database**
   - Copy the **Connection String** (Transaction mode or Session mode)
   - Choose **Transaction** pooling for better performance: `?pgbouncer=true`

3. **Update your `.env` file**:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

4. **Verify the connection**:
   ```bash
   npx prisma db pull
   ```

   If successful, you'll see your schema downloaded.

### Option 2: Switch to Local PostgreSQL (Recommended for Development)

1. **Install PostgreSQL** (if not already installed):
   
   **macOS**:
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

   **Ubuntu/Debian**:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

   **Windows**:
   Download from https://www.postgresql.org/download/windows/

2. **Create a database**:
   ```bash
   # macOS/Linux
   createdb inventory_crm
   
   # Or using psql
   psql postgres
   CREATE DATABASE inventory_crm;
   \q
   ```

3. **Update your `.env` file**:
   ```env
   DATABASE_URL="postgresql://localhost:5432/inventory_crm"
   ```

   Or with username/password:
   ```env
   DATABASE_URL="postgresql://yourusername:yourpassword@localhost:5432/inventory_crm"
   ```

4. **Run migrations and seed**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

### Option 3: Use Docker PostgreSQL (Quick Setup)

1. **Start PostgreSQL in Docker**:
   ```bash
   docker run --name inventory-db \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=inventory_crm \
     -p 5432:5432 \
     -d postgres:15
   ```

2. **Update your `.env` file**:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/inventory_crm"
   ```

3. **Run migrations and seed**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

## Verification Steps

After fixing the database connection:

1. **Test the connection**:
   ```bash
   npx prisma db pull
   ```
   
   Should complete without errors.

2. **Restart your dev server**:
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

3. **Try logging in** with demo credentials:
   - Email: `admin@example.com`
   - Password: `admin123`

4. **Check logs** - should see successful database queries instead of timeout errors.

## Common Issues

### Issue: "relation does not exist"

**Solution**: Your database is empty. Run migrations:
```bash
npm run db:push
npm run db:seed
```

### Issue: "password authentication failed"

**Solution**: Check your database username and password in `DATABASE_URL`

### Issue: "database does not exist"

**Solution**: Create the database:
```bash
createdb inventory_crm
```

### Issue: Still getting timeout errors

**Solution**: 
1. Check if PostgreSQL is actually running:
   ```bash
   # macOS/Linux
   pg_isready
   
   # Or check the process
   ps aux | grep postgres
   ```

2. Check your firewall settings
3. Verify the host and port are correct (usually `localhost:5432`)

## Demo Credentials

After successfully seeding the database, use these credentials to log in:

- **Admin**: `admin@example.com` / `admin123`
- **Manager**: `manager@example.com` / `manager123`
- **Viewer**: `viewer@example.com` / `viewer123`

## Need More Help?

Check the console logs when trying to log in. The enhanced error handling now shows:
- Red database connection errors with specific guidance
- Detailed error messages in the console
- Clear distinction between connection issues vs invalid credentials

---

**Quick Reference**:
- ✅ Local PostgreSQL: `postgresql://localhost:5432/inventory_crm`
- ✅ Docker PostgreSQL: `postgresql://postgres:postgres@localhost:5432/inventory_crm`
- ✅ Supabase: Check your project dashboard for the correct connection string
