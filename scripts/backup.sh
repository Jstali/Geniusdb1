#!/bin/bash
# GeniusDB - Database Backup Script

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="geniusdb_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Starting database backup..."
docker-compose exec -T postgres pg_dump -U geniususer geniusdb > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✓ Backup completed successfully: ${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Compress backup
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    echo "✓ Backup compressed: ${BACKUP_DIR}/${BACKUP_FILE}.gz"
    
    # Keep only last 7 backups
    cd "$BACKUP_DIR"
    ls -t geniusdb_backup_*.sql.gz | tail -n +8 | xargs -r rm
    echo "✓ Old backups cleaned up (keeping last 7)"
    
    echo "Backup process completed successfully!"
else
    echo "✗ Backup failed!"
    exit 1
fi

