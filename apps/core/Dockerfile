# ==============================================================================
# RAVISN Platform: Laravel Core & Inertia React Production Dockerfile
# ==============================================================================

FROM php:8.3-fpm-alpine

WORKDIR /var/www/html

# Install system tools and runtime utilities
RUN apk add --no-cache \
    curl \
    git \
    zip \
    unzip \
    nginx \
    supervisor \
    nodejs \
    npm

# Install PHP extensions with official installer helper
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions \
    pdo \
    pdo_pgsql \
    pgsql \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    opcache \
    redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy application files
COPY . /var/www/html

# Install PHP composer dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs

# Install Frontend dependencies and compile Vite + Wayfinder assets
RUN npm install --legacy-peer-deps && npm run build

# Fix file permissions for Laravel storage and cache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Nginx & PHP-FPM integration configuration
RUN mkdir -p /run/nginx /var/log/supervisor

COPY deploy/docker-nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/docker-supervisord.conf /etc/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisord.conf"]

