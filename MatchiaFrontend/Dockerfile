# ==============================
# ÉTAPE 1 : BUILD REACT
# ==============================

FROM node:22-alpine AS build

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le projet
COPY . .

# Variable utilisée par Vite
ARG VITE_API_URL=http://lvh.me:8081

ENV VITE_API_URL=$VITE_API_URL

# Créer le build de production
RUN npm run build


# ==============================
# ÉTAPE 2 : NGINX
# ==============================

FROM nginx:alpine

# Supprimer la configuration Nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Ajouter notre configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build React
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]