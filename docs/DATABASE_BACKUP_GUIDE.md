# Database Backup & Restoration Guide

## Overview
This guide covers how to set up automated backups for your Supabase database and perform manual backups/restores. Backups are **CRITICAL** before launching to prevent data loss.

## 🚨 CRITICAL: Enable Backups Before Beta Launch

### Why Backups Matter
- **User Data Protection**: Lost testimonies, messages, or connections = lost users
- **Recovery from Mistakes**: Accidental DELETE queries, bad migrations
- **Peace of Mind**: Sleep better knowing data is safe
- **Investor Confidence**: Shows professional data handling

## Automatic Backups (Supabase Dashboard)

### Step 1: Enable Point-in-Time Recovery (PITR)
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your Lightning project
3. Navigate to **Settings** → **Database**
4. Scroll to **Backups**
5. Enable **Point-in-time Recovery**
   - Free tier: 7-day retention
   - Pro tier ($25/month): 30-day retention
6. Click **Save**

### Step 2: Verify Backup Settings
1. In **Settings** → **Database** → **Backups**
2. You should see:
   - ✅ Daily backups: Enabled
   - ✅ Point-in-time recovery: Enabled
   - ✅ Retention period: 7 days (free) or 30 days (pro)

### What Gets Backed Up
- ✅ All tables (users, testimonies, groups, messages, etc.)
- ✅ All data relationships
- ✅ Database schema
- ✅ RLS policies
- ✅ Functions and triggers
- ❌ Storage files (handled by Cloudinary)

## Manual Backup (Before Major Changes)

### Using Supabase CLI
```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Create backup
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# List backups
ls -la backup-*.sql
```

### Using pg_dump (Direct Connection)
```bash
# Get connection string from Supabase Dashboard
# Settings → Database → Connection String → URI

# Create backup
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f backup-$(date +%Y%m%d-%H%M%S).sql \
  --verbose \
  --no-owner \
  --no-privileges
```

### Quick Export from Dashboard
1. Go to **Table Editor** in Supabase Dashboard
2. Select a table
3. Click **Export** → **Export as CSV**
4. Repeat for critical tables:
   - users
   - testimonies
   - groups
   - messages
   - friend_requests

## Backup Storage Best Practices

### Local Backups
```bash
# Create backup directory
mkdir -p ~/lightning-backups/$(date +%Y-%m)

# Move backup to organized location
mv backup-*.sql ~/lightning-backups/$(date +%Y-%m)/

# Compress old backups
gzip ~/lightning-backups/$(date +%Y-%m)/backup-*.sql
```

### Cloud Storage (Recommended)
1. **Google Drive**
   ```bash
   # Upload to Google Drive (requires gdrive CLI)
   gdrive upload backup-*.sql
   ```

2. **Dropbox**
   ```bash
   # Upload to Dropbox (requires Dropbox CLI)
   dropbox upload backup-*.sql /Lightning-Backups/
   ```

3. **AWS S3** (Most Professional)
   ```bash
   # Upload to S3
   aws s3 cp backup-*.sql s3://your-backup-bucket/lightning/
   ```

## Restoration Process

### From Supabase Dashboard (PITR)
1. Go to **Settings** → **Database** → **Backups**
2. Click **Restore to a point in time**
3. Select date and time
4. Click **Restore**
5. Wait 5-10 minutes for restoration

### From SQL Backup File
```bash
# Method 1: Using psql
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f backup-20241024.sql

# Method 2: Using Supabase CLI
supabase db push backup-20241024.sql

# Method 3: From Dashboard
# SQL Editor → New Query → Paste SQL → Run
```

### Testing Restoration (Important!)
1. Create a test Supabase project
2. Restore backup to test project
3. Verify:
   - All tables present
   - Row counts match
   - Relationships intact
   - App connects successfully

## Backup Schedule Recommendations

### Daily (Automated)
- ✅ Handled by Supabase automatically
- Runs at 2 AM UTC
- 7-day retention (free tier)

### Weekly (Manual)
Every Sunday:
1. Download manual backup
2. Upload to cloud storage
3. Test restoration to staging

### Before Major Changes
- Before database migrations
- Before deleting data
- Before schema changes
- Before beta launch
- Before public launch

## Monitoring Backup Health

### Weekly Checklist
- [ ] Verify daily backups running (Dashboard → Backups)
- [ ] Download weekly manual backup
- [ ] Upload to cloud storage
- [ ] Test restore to staging (monthly)
- [ ] Delete backups older than 3 months

### Set Calendar Reminders
1. Weekly: "Lightning Database Backup Check"
2. Monthly: "Test Lightning Database Restoration"
3. Before launch: "Full database backup and test"

## Emergency Recovery Contacts

### Supabase Support
- Email: support@supabase.io
- Dashboard: Help → Support
- Response time: 24-48 hours (free tier)

### Backup Locations
Document where backups are stored:
1. Supabase PITR: Last 7 days automatic
2. Local: ~/lightning-backups/
3. Cloud: [Your cloud storage location]
4. Critical backup: [Date and location of pre-launch backup]

## Pre-Launch Backup Checklist

Before beta launch:
- [ ] Enable Point-in-Time Recovery in Supabase
- [ ] Create manual backup
- [ ] Download backup locally
- [ ] Upload to cloud storage
- [ ] Test restoration to staging project
- [ ] Document backup location
- [ ] Set weekly backup reminder
- [ ] Share backup access with co-founder

## Common Issues & Solutions

### Issue: Backup fails with permission error
**Solution**: Check database connection string and credentials

### Issue: Restore creates duplicate data
**Solution**: Always restore to empty database or use `--clean` flag

### Issue: Backup file too large
**Solution**: Use compression: `pg_dump ... | gzip > backup.sql.gz`

### Issue: Can't restore specific table
**Solution**: Use selective restore:
```bash
pg_restore -t users -d database_url backup.sql
```

## Cost Considerations

### Free Tier
- Daily backups: ✅ Free
- 7-day retention: ✅ Free
- Manual backups: ✅ Free
- Storage: Your responsibility

### Pro Tier ($25/month)
- 30-day retention
- Better support
- Worth it after 100+ users

## Next Steps

1. **Right Now** (5 minutes):
   - Log into Supabase Dashboard
   - Enable Point-in-Time Recovery
   - Verify it's active

2. **Today** (30 minutes):
   - Create first manual backup
   - Store in cloud
   - Document location

3. **This Week**:
   - Test restoration process
   - Set up weekly reminder
   - Share access with team

---

**Remember**: It's better to have backups and not need them than to need backups and not have them. One lost database = lost users, lost trust, lost business.