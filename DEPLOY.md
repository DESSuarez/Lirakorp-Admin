# Guía de Despliegue en Hostinger

## Requisitos Previos

- Hostinger VPS (plan KVM 2 o superior recomendado)
- Dominio configurado apuntando al VPS
- Acceso SSH al servidor

## Paso 1: Preparar el Servidor

Conéctate a tu VPS por SSH:

```bash
ssh root@tu-ip-del-vps
```

Instala Node.js 20 y las dependencias:

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # debe ser v20.x
npm --version

# Instalar PM2 para mantener la app corriendo
sudo npm install -g pm2

# Instalar Nginx como reverse proxy
sudo apt-get install -y nginx

# Instalar certbot para SSL
sudo apt-get install -y certbot python3-certbot-nginx
```

## Paso 2: Configurar MySQL (Opcional - Recomendado para producción)

```bash
sudo apt-get install -y mysql-server
sudo mysql_secure_installation

# Crear base de datos
sudo mysql -u root -p
```

```sql
CREATE DATABASE property_manager;
CREATE USER 'propadmin'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON property_manager.* TO 'propadmin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Nota:** Si prefieres usar SQLite (más simple), puedes saltarte este paso. SQLite funciona bien para uso personal/pequeño.

## Paso 3: Subir el Código

Opción A - Git (recomendado):
```bash
cd /var/www
git clone tu-repositorio property-manager
cd property-manager
```

Opción B - SFTP/SCP:
```bash
# Desde tu computadora local:
scp -r ./property-manager root@tu-ip:/var/www/property-manager
```

## Paso 4: Configurar Variables de Entorno

```bash
cd /var/www/property-manager
cp .env.example .env
nano .env
```

Edita el archivo `.env`:

```env
# Para SQLite (simple):
DATABASE_URL="file:./prod.db"

# Para MySQL (producción):
# DATABASE_URL="mysql://propadmin:tu_contraseña@localhost:3306/property_manager"

NEXTAUTH_URL="https://tudominio.com"
NEXTAUTH_SECRET="genera-esto-con: openssl rand -base64 32"

# Email - Hostinger SMTP
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT=465
SMTP_USER="admin@tudominio.com"
SMTP_PASS="tu-contraseña-de-correo"
EMAIL_FROM="Administración <admin@tudominio.com>"

# WhatsApp (opcional)
TWILIO_ACCOUNT_SID="tu_sid"
TWILIO_AUTH_TOKEN="tu_token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"

APP_URL="https://tudominio.com"
UPLOAD_DIR="./public/uploads"
```

**Si usas MySQL**, cambia el provider en `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

## Paso 5: Instalar y Construir

```bash
cd /var/www/property-manager

# Instalar dependencias
npm install

# Generar cliente de Prisma y crear tablas
npx prisma generate
npx prisma db push

# Cargar datos iniciales (admin, zonas, plantilla)
npm run db:seed

# Construir la aplicación
npm run build
```

## Paso 6: Configurar PM2

```bash
# Iniciar la aplicación
pm2 start npm --name "property-manager" -- start

# Configurar para que inicie automáticamente al reiniciar el servidor
pm2 startup
pm2 save

# Comandos útiles:
pm2 status              # Ver estado
pm2 logs property-manager  # Ver logs
pm2 restart property-manager  # Reiniciar
```

## Paso 7: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/property-manager
```

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar el sitio
sudo ln -s /etc/nginx/sites-available/property-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Paso 8: Configurar SSL (HTTPS)

```bash
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

Sigue las instrucciones de certbot. Se renovará automáticamente.

## Paso 9: Configurar Cron para Alertas Automáticas

```bash
crontab -e
```

Agrega esta línea para ejecutar las alertas diariamente a las 8am:

```cron
0 8 * * * cd /var/www/property-manager && /usr/bin/npx tsx scripts/send-alerts.ts >> /var/log/property-alerts.log 2>&1
```

## Paso 10: Configurar Correo en Hostinger

1. Entra al panel de Hostinger > Emails
2. Crea una cuenta de correo (ej: admin@tudominio.com)
3. Los datos SMTP de Hostinger son:
   - Host: `smtp.hostinger.com`
   - Puerto: `465` (SSL)
   - Usuario: `admin@tudominio.com`
   - Contraseña: la que configuraste

## Paso 11: Primer Acceso

1. Abre `https://tudominio.com` en tu navegador
2. Inicia sesión con:
   - **Admin:** admin@propiedades.com / admin123
   - **Editor:** editor@propiedades.com / editor123
3. **IMPORTANTE:** Cambia las contraseñas predeterminadas inmediatamente desde la sección de Usuarios

## Actualizaciones

Para actualizar la aplicación:

```bash
cd /var/www/property-manager
git pull origin main
npm install
npx prisma db push
npm run build
pm2 restart property-manager
```

## Respaldos

Configura respaldos automáticos de la base de datos:

```bash
# Para SQLite - respaldar diariamente
0 2 * * * cp /var/www/property-manager/prod.db /var/backups/property-manager-$(date +\%Y\%m\%d).db

# Para MySQL
0 2 * * * mysqldump -u propadmin -p'tu_contraseña' property_manager > /var/backups/property-manager-$(date +\%Y\%m\%d).sql
```

## Solución de Problemas

### La app no inicia
```bash
pm2 logs property-manager --lines 50
```

### Error de permisos en uploads
```bash
sudo chown -R www-data:www-data /var/www/property-manager/public/uploads
sudo chmod -R 755 /var/www/property-manager/public/uploads
```

### Error de conexión a la base de datos
```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# O verificar que el archivo SQLite exista
ls -la /var/www/property-manager/prod.db
```
