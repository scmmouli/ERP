#!/bin/sh
# Daily database backup. Run from the repo root on the server:  sh deploy/backup.sh
set -e
mkdir -p backups
FILE="backups/erp_$(date +%F_%H%M).sql.gz"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$FILE"
echo "Saved $FILE"
# keep two weeks of backups on the server
find backups -name 'erp_*.sql.gz' -mtime +14 -delete
