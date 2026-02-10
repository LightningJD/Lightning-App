#!/bin/bash

# Lightning Database Restoration Script
# Use this to restore from a backup file

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Lightning Database Restoration Script${NC}"
echo "========================================="

# Check if backup file provided
if [[ $# -eq 0 ]]; then
    echo -e "${YELLOW}Usage: $0 <backup-file>${NC}"
    echo ""
    echo "Available backups:"
    ls -lh backups/*.sql* 2>/dev/null || echo "No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: Database Restoration${NC}"
echo "=================================="
echo "This will REPLACE your current database with the backup!"
echo "Current data will be LOST if not backed up."
echo ""
echo -e "Restoring from: ${GREEN}$BACKUP_FILE${NC}"
echo ""
read -p "Are you SURE you want to restore? Type 'yes' to continue: " -r CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
    echo -e "${YELLOW}Restoration cancelled.${NC}"
    exit 0
fi

# Check if .env.local exists
if [[ ! -f ".env.local" ]]; then
    echo -e "${RED}❌ Error: .env.local not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Extract project ref from URL
PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')
echo -e "${GREEN}✓${NC} Project: $PROJECT_REF"

# Decompress if needed
RESTORE_FILE=$BACKUP_FILE
if [[ $BACKUP_FILE == *.gz ]]; then
    echo -e "${YELLOW}📦 Decompressing backup...${NC}"
    RESTORE_FILE="${BACKUP_FILE%.gz}"
    gunzip -k "$BACKUP_FILE"
    echo -e "${GREEN}✓${NC} Decompressed to: $RESTORE_FILE"
fi

echo ""
echo -e "${RED}🚨 CRITICAL: Manual Restoration Required${NC}"
echo "======================================="
echo ""
echo "For safety, restoration must be done manually through Supabase:"
echo ""
echo -e "${YELLOW}Option 1: SQL Editor (Recommended)${NC}"
echo "1. Go to: https://app.supabase.com/project/$PROJECT_REF"
echo "2. Navigate to: SQL Editor"
echo "3. Click: New Query"
echo "4. Copy contents of: $RESTORE_FILE"
echo "5. Paste into query editor"
echo "6. Click: Run"
echo ""
echo -e "${YELLOW}Option 2: Supabase CLI${NC}"
echo "1. Install Supabase CLI:"
echo "   brew install supabase/tap/supabase"
echo "2. Login:"
echo "   supabase login"
echo "3. Link project:"
echo "   supabase link --project-ref $PROJECT_REF"
echo "4. Restore:"
echo "   supabase db push $RESTORE_FILE"
echo ""
echo -e "${YELLOW}Option 3: Direct psql (Requires connection string)${NC}"
echo "1. Get connection string from Dashboard → Settings → Database"
echo "2. Run:"
echo '   psql "YOUR_CONNECTION_STRING" -f' "$RESTORE_FILE"
echo ""

# Create restoration instructions file
INSTRUCTIONS_FILE="${RESTORE_FILE%.sql}-restore-instructions.txt"
cat > "$INSTRUCTIONS_FILE" << EOF
Lightning Database Restoration Instructions
==========================================
Generated: $(date)
Backup File: $RESTORE_FILE

OPTION 1: SQL EDITOR (EASIEST)
------------------------------
1. Go to: https://app.supabase.com/project/$PROJECT_REF
2. Navigate to: SQL Editor
3. Click: New Query
4. Copy ALL contents from: $RESTORE_FILE
5. Paste into query editor
6. Click: Run

OPTION 2: SUPABASE CLI
----------------------
supabase db push $RESTORE_FILE

OPTION 3: DIRECT PSQL
--------------------
psql "postgresql://postgres:[PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres" -f $RESTORE_FILE

VERIFICATION AFTER RESTORE
-------------------------
1. Check table counts:
   - SELECT COUNT(*) FROM users;
   - SELECT COUNT(*) FROM testimonies;
   - SELECT COUNT(*) FROM messages;

2. Test app connection:
   - Open the app
   - Try logging in
   - Check if data loads

3. If issues occur:
   - Restore from Supabase's automatic backup
   - Settings → Database → Backups → Restore

SUPPORT
-------
Supabase Support: support@supabase.io
Dashboard Help: https://app.supabase.com/support
EOF

echo -e "${GREEN}✅ Instructions saved to:${NC}"
echo "   $INSTRUCTIONS_FILE"
echo ""
echo -e "${BLUE}Post-Restoration Checklist:${NC}"
echo "[ ] Verify row counts match expected"
echo "[ ] Test user login"
echo "[ ] Check critical features work"
echo "[ ] Monitor error logs"
echo "[ ] Create new backup after verification"
echo ""
echo "========================================="
echo -e "${GREEN}Instructions ready. Follow the steps above to restore.${NC}"