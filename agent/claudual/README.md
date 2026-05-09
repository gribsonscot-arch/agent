# Claudual Setup & Deployment

## Local Setup (PowerShell)
```powershell
# 1. Install dependencies
npm install

# 2. Configure environment
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Edit .env with your keys

# 3. Run locally
npm start
```

## Vercel Deployment (PowerShell)
```powershell
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod
```

## Register Webhooks (PowerShell)
```powershell
# Telegram
$token = "YOUR_TELEGRAM_TOKEN"
$url = "https://your-vercel-app.vercel.app/api/telegram"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook?url=$url"
```

## Supabase Schema
Run these in Supabase SQL Editor:
```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  message text,
  response text,
  source text,
  created_at timestamp with time zone default now()
);

create table wiki_pages (
  id uuid primary key default gen_random_uuid(),
  title text unique,
  content text,
  updated_at timestamp with time zone default now()
);

create table wiki_logs (
  id uuid primary key default gen_random_uuid(),
  action text,
  target text,
  created_at timestamp with time zone default now()
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  instructions text
);
```
