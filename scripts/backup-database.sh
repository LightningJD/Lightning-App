#!/bin/bash

# Lightning Database Backup Script
# Run this before any major changes or weekly for safety

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  Lightning Database Backup Script${NC}"
echo "======================================"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ Error: .env.local not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check for required variables
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${RED}❌ Error: VITE_SUPABASE_URL not found in .env.local${NC}"
    exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')
echo -e "${GREEN}✓${NC} Project: $PROJECT_REF"

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql"

echo -e "${YELLOW}📦 Creating backup...${NC}"

# Method 1: Try Supabase CLI first (if installed)
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    supabase db dump -f "$BACKUP_FILE" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Supabase CLI failed, trying alternative method...${NC}"
        METHOD_FAILED=true
    }
fi

# Method 2: Direct SQL export command (requires connection string)
if [ ! -f "$BACKUP_FILE" ] || [ "$METHOD_FAILED" = true ]; then
    echo -e "${YELLOW}📋 Manual Backup Instructions:${NC}"
    echo ""
    echo "Since automated backup requires database credentials, please:"
    echo ""
    echo "1. Go to: https://app.supabase.com/project/$PROJECT_REF"
    echo "2. Navigate to: Table Editor"
    echo "3. Export each critical table as CSV:"
    echo "   - users"
    echo "   - testimonies"
    echo "   - groups"
    echo "   - group_members"
    echo "   - messages"
    echo "   - friend_requests"
    echo "   - reactions"
    echo ""
    echo "4. Save exports to: $BACKUP_DIR/"
    echo ""
    echo "OR"
    echo ""
    echo "5. Go to: Settings → Database → Backups"
    echo "6. Click: 'Download backup'"
    echo "7. Save as: $BACKUP_FILE"

    # Create a marker file with instructions
    echo "Backup requested at $TIMESTAMP" > "$BACKUP_FILE.pending"
    echo "Please complete manual backup as instructed above" >> "$BACKUP_FILE.pending"
fi

# Check if backup was created
if [ -f "$BACKUP_FILE" ]; then
    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $SIZE"

    # Compress the backup
    echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
    gzip -k "$BACKUP_FILE"
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    echo -e "${GREEN}✓${NC} Compressed to: $COMPRESSED_SIZE"

    # List recent backups
    echo ""
    echo -e "${GREEN}📚 Recent backups:${NC}"
    ls -lh $BACKUP_DIR/*.sql* 2>/dev/null | tail -5 || echo "No backups found"

    # Cleanup old backups (keep last 10)
    echo ""
    echo -e "${YELLOW}🧹 Cleaning old backups...${NC}"
    ls -t $BACKUP_DIR/*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Keeping last 10 backups"

    echo ""
    echo -e "${GREEN}✨ Backup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Upload to cloud storage (Google Drive, Dropbox, etc.)"
    echo "2. Test restoration on a staging project"
    echo "3. Document this backup in your backup log"

else
    echo ""
    echo -e "${YELLOW}⚠️  Backup pending manual completion${NC}"
    echo "Instructions saved to: $BACKUP_FILE.pending"
    echo ""
    echo "After completing manual backup, run:"
    echo "  mv your-backup.sql $BACKUP_FILE"
    echo "  rm $BACKUP_FILE.pending"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Remember: Backups are your safety net!${NC}"