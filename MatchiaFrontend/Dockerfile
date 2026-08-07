# ===============================
# Étape 1 : construire React/Vite
# ===============================
FROM node:22-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer exactement les dépendances du package-lock.json
RUN npm ci

# Copier le reste du frontend
COPY . .

# URL utilisée par Axios dans le frontend
ARG VITE_API_URL=/backend
ENV VITE_API_URL=${VITE_API_URL}

# Construire le frontend
RUN npm run build


# ===============================
# Étape 2 : servir avec Nginx
# ===============================
FROM nginx:alpine

# Supprimer la configuration Nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier notre configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le frontend compilé
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]