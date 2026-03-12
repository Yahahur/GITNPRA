# Mixsched XAMPP Deployment Guide (Company Wi-Fi / LAN Only)

This project is static front-end and can run under XAMPP Apache.

## 1) Copy project into XAMPP htdocs

- Windows typical path: `C:\xampp\htdocs\Mixsched`

## 2) Enable required Apache modules

In `apache/conf/httpd.conf`, make sure these are enabled:

- `LoadModule authz_core_module modules/mod_authz_core.so`
- `LoadModule headers_module modules/mod_headers.so`

## 3) Enable VirtualHost (recommended)

- Copy settings from `xampp-vhost.conf.example` into `apache/conf/extra/httpd-vhosts.conf`.
- Update `DocumentRoot` and allowed `Require ip` ranges to match your company network.

## 4) Restrict access to company Wi-Fi only

You have two layers:

1. `.htaccess` (already included in repo) with `Require ip`.
2. VirtualHost `<Directory>` rules in Apache config.

Update the allowed subnet(s) to your actual company LAN (example: `192.168.50.0/24`).

## 5) Restart Apache

- Use XAMPP control panel → Stop Apache → Start Apache.

## 6) Access from company network

- Open `http://<server-ip>/Mixsched/login.html`
- Optional DNS: map `mixsched.company.local` to server IP.

## Notes

- Current app stores data in browser `localStorage`, so data is per-browser/per-device.
- For shared centralized data between all users, add a backend API/database layer.
