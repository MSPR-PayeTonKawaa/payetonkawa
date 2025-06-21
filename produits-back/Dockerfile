# Dockerfile pour l'API Produits PayeTonKawa
FROM node:20-alpine AS development

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de configuration des dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=development

# Copier le code source
COPY . .

# Générer la build de l'application
RUN npm run build

# Étape de production
FROM node:20-alpine AS production

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3002

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Copier la build et changer la propriété
COPY --from=development --chown=nestjs:nodejs /usr/src/app/dist ./dist

# Utiliser l'utilisateur non-root
USER nestjs

# Exposer le port de l'application
EXPOSE 3002

# Commande de démarrage
CMD ["node", "dist/main.js"] 