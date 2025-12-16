# Railway: How to Link Database Service (Step-by-Step)

## ⚠️ IMPORTANT
Railway does NOT automatically create `DATABASE_URL` just because both services exist in the same project. You must **explicitly link** them.

## 📋 Step-by-Step Instructions

### Step 1: Identify Your Services

1. Go to your Railway project dashboard: https://railway.app
2. You should see at least 2 services:
   - **Your app service** (the one running your code - might be named "web", "app", or similar)
   - **Your database service** (probably named "main" or "Postgres")

### Step 2: Open Your App Service

1. **Click on your APP SERVICE** (not the database)
2. This should open the service details page

### Step 3: Go to Settings

1. Click the **"Settings"** tab at the top
2. Scroll down to find **"Connected Services"** section

### Step 4: Connect the Database

1. In the **"Connected Services"** section, you'll see:
   - Either a list of connected services (might be empty)
   - Or a button that says **"Connect Service"** or **"Add Service"**

2. **Click "Connect Service"** (or "Add Service")

3. A dropdown/modal will appear showing available services

4. **Select your database service** (probably "main" or "Postgres")

5. Click **"Connect"** or **"Add"**

### Step 5: Verify DATABASE_URL Was Created

1. Still in your app service, click the **"Variables"** tab
2. Look for `DATABASE_URL` in the list
3. **It should now appear!** 
4. Click on it to verify it starts with `postgresql://`

### Step 6: Redeploy

1. Railway should automatically redeploy after connecting
2. Or manually trigger: Go to **"Deployments"** tab → Click **"Redeploy"** on the latest deployment

## 🎯 Visual Guide

```
Railway Project Dashboard
├── 📦 Your App Service (click this one!)
│   ├── Settings tab
│   │   └── Connected Services section
│   │       └── [Connect Service] button ← Click here!
│   │           └── Select "main" or your database service
│   └── Variables tab
│       └── DATABASE_URL ← Should appear here after linking!
│
└── 🗄️ Database Service ("main" or "Postgres")
    └── (Don't click this one - you're linking FROM app TO database)
```

## ❓ What If "Connect Service" Button Doesn't Exist?

If you don't see a "Connect Service" button:

1. **Check if services are already connected:**
   - Look in "Connected Services" section
   - If your database is already listed, it should have `DATABASE_URL` set
   - If `DATABASE_URL` is still missing, try disconnecting and reconnecting

2. **Try disconnecting and reconnecting:**
   - If database is listed in Connected Services, click the disconnect/remove button
   - Then click "Connect Service" again
   - Select your database service

3. **Check if database service exists:**
   - Make sure you actually have a PostgreSQL database service
   - If not, create one: "New" → "Database" → "Add PostgreSQL"

## ✅ Verification Checklist

After following the steps above:

- [ ] Database service exists in Railway project
- [ ] App service has database listed in "Connected Services"
- [ ] `DATABASE_URL` appears in app service Variables tab
- [ ] `DATABASE_URL` starts with `postgresql://` or `postgres://`
- [ ] App has been redeployed after linking

## 🚨 Common Mistakes

1. **Linking from database service instead of app service**
   - ❌ Wrong: Click database service → Try to connect app
   - ✅ Right: Click app service → Connect database

2. **Thinking both services in same project = automatically linked**
   - ❌ Wrong: Just having both services isn't enough
   - ✅ Right: Must explicitly connect them

3. **Not redeploying after linking**
   - ❌ Wrong: Linking but not redeploying
   - ✅ Right: Link, then redeploy

## 📞 Still Having Issues?

If `DATABASE_URL` still doesn't appear after linking:

1. **Check Railway logs:**
   - App service → Deployments → Latest → Logs
   - Look for any database connection errors

2. **Verify database service is running:**
   - Click on database service
   - Check it shows "Active" status

3. **Try manual connection:**
   - In app service Variables tab
   - Click "New Variable"
   - Name: `DATABASE_URL`
   - Value: Get from database service → Variables tab → Copy the connection string
   - **Note:** This is a workaround - Railway should set it automatically

## 🎉 After It's Fixed

Once `DATABASE_URL` is set:
- ✅ Hangout creation will work
- ✅ User creation will work
- ✅ Notifications stream will work
- ✅ All database operations will work
