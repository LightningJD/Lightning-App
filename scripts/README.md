# Lightning Database Scripts

## Quick Start

### 🗄️ Create a Backup
```bash
./scripts/backup-database.sh
```
Run weekly or before major changes.

### 🔄 Restore from Backup
```bash
./scripts/restore-database.sh backups/backup-20241024-1234.sql
```
Use when you need to rollback changes.

## What These Scripts Do

### backup-database.sh
- Creates timestamped SQL backups
- Compresses backups to save space
- Keeps last 10 backups automatically
- Provides manual backup instructions if CLI fails

### restore-database.sh
- Guides you through restoration process
- Decompresses .gz files automatically
- Creates step-by-step instructions file
- Includes verification checklist

## Backup Schedule

| When | Why | Command |
|------|-----|---------|
| **Weekly** | Regular safety net | `./scripts/backup-database.sh` |
| **Before migrations** | Prevent data loss | `./scripts/backup-database.sh` |
| **Before deleting data** | Recovery option | `./scripts/backup-database.sh` |
| **Before launch** | Production safety | `./scripts/backup-database.sh` |

## Storage Locations

- **Local**: `./backups/` directory
- **Supabase**: Automatic daily backups (7-day retention)
- **Cloud**: Upload important backups to Google Drive/Dropbox

## Emergency Contacts

- **Supabase Support**: support@supabase.io
- **Dashboard**: https://app.supabase.com

## Important Notes

1. **Always backup before**:
   - Database schema changes
   - Mass data updates
   - Deploying to production
   - Sharing with beta testers

2. **Test restoration**:
   - Try restoring to a test project monthly
   - Verify data integrity after restore
   - Document any issues found

3. **Cloud backup**:
   - Don't rely only on local backups
   - Upload critical backups to cloud storage
   - Share access with co-founders

## Troubleshooting

**Script won't run**:
```bash
chmod +x scripts/*.sh
```

**Can't find project**:
```bash
# Run from project root where .env.local exists
cd ~/lightning
./scripts/backup-database.sh
```

**Backup fails**:
- Follow manual instructions in script output
- Use Supabase Dashboard for manual export

**Restore fails**:
- Check file path is correct
- Ensure you have database permissions
- Try using Supabase Dashboard SQL Editor

---

Remember: **No backup = No safety net!** Run backups regularly.