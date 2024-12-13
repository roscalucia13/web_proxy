const express = require('express');
const Redis = require('ioredis');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configurare conexiune Redis cu TLS activat
const redisClient = new Redis(process.env.REDIS_URL, {
    tls: {}, // Activează TLS
});

// Event handlers pentru Redis
redisClient.on('connect', () => {
    console.log('Conexiunea cu Redis a fost realizată cu succes!');
});

redisClient.on('error', (err) => {
    console.error('Eroare la conectarea cu Redis:', err);
});

// Configurare conexiune PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Dezactivează verificarea certificatului pentru simplitate
    },
});

// Endpoint principal
app.get('/', async (req, res) => {
    try {
        const cacheKey = `message:${port}`;
        const cachedData = await redisClient.get(cacheKey);

        let message;
        if (cachedData) {
            message = cachedData; // Folosește datele din Redis
        } else {
            message = `Salut! Aceasta este instanța care rulează pe portul ${port}.`;

            // Salvează mesajul în Redis cu expirare de 10 secunde
            await redisClient.set(cacheKey, message, 'EX', 10);

            // Salvează mesajul în PostgreSQL
            const query = 'INSERT INTO messages (message) VALUES ($1)';
            await pool.query(query, [message]);
        }

        // Generăm răspunsul HTML
        res.send(`
            <!DOCTYPE html>
            <html lang="ro">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Instanță</title>
                <style>
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        font-family: Arial, sans-serif;
                        background-color: #f8d2ea;
                    }
                    h1 {
                        color: #333;
                        text-align: center;
                        font-size: 24px;
                    }
                </style>
            </head>
            <body>
                <h1>${message}</h1>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Eroare la procesarea cererii:', err);
        res.status(500).send('Eroare internă a serverului.');
    }
});

// Pornirea serverului
app.listen(port, () => {
    console.log(`Serverul funcționează pe portul ${port}`);
});
