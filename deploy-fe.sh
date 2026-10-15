#!/bin/bash
set -e

cd /var/www/task-manager-fe
git pull
rm -rf .next
npm run build
pm2 restart qlcv-nextjs --update-env
