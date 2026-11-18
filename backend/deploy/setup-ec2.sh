#!/usr/bin/env bash
# Instalacion inicial en un EC2 con Ubuntu 22.04/24.04.
# Uso (en el EC2, con el repositorio ya copiado en /opt/bet-ips):
#   sudo bash /opt/bet-ips/backend/deploy/setup-ec2.sh
set -euo pipefail

APP_DIR=/opt/bet-ips/backend

apt-get update
apt-get install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx

cd "$APP_DIR"
sudo -u ubuntu python3 -m venv .venv
sudo -u ubuntu .venv/bin/pip install --upgrade pip
sudo -u ubuntu .venv/bin/pip install -r requirements.txt

[ -f .env ] || sudo -u ubuntu cp .env.example .env

# Entrena el modelo en el propio EC2 con la carpeta Data/ del repositorio (/opt/bet-ips/Data).
sudo -u ubuntu .venv/bin/python -m training.train

cp deploy/bet-ips-api.service /etc/systemd/system/bet-ips-api.service
systemctl daemon-reload
systemctl enable --now bet-ips-api

cp deploy/nginx-bet-ips.conf /etc/nginx/sites-available/bet-ips
ln -sf /etc/nginx/sites-available/bet-ips /etc/nginx/sites-enabled/bet-ips
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "Listo. Prueba: curl http://127.0.0.1/api/health -H 'Host: api.tu-dominio.com'"
echo "Recuerda editar $APP_DIR/.env (ALLOWED_ORIGINS) y reiniciar: sudo systemctl restart bet-ips-api"
