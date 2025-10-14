#!/bin/bash
# GeniusDB - Database Restore Script

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo "Example: ./restore.sh backups/geniusdb_backup_20250101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "✗ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup file..."
    gunzip -k "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

# Confirm restore
echo "⚠️  WARNING: This will overwrite the current database!"
read -p "Are you sure you want to restore from $BACKUP_FILE? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Restore database
echo "Starting database restore..."
docker-compose exec -T postgres psql -U geniususer -d geniusdb < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully!"
else
    echo "✗ Restore failed!"
    exit 1
fi

