FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install pg dotenv
COPY . .
CMD ["node", "app.js"]
