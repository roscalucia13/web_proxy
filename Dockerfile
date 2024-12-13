# Folosește Node.js ca imagine de bază
FROM node:16

# Setează directorul de lucru în container
WORKDIR /app

# Copiază fișierele package.json și package-lock.json din service în directorul de lucru
COPY service/package*.json ./

# Instalează dependențele necesare
RUN npm install pg dotenv ioredis express

# Copiază restul codului sursă din service în directorul de lucru
COPY service/ ./

# Expune portul 3000
EXPOSE 3000

# Setează comanda de pornire a aplicației
CMD ["node", "app.js"]
