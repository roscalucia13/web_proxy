const express = require('express');
const redis = require('redis');
const cassandra = require('cassandra-driver'); // Adăugăm driverul Cassandra
const app = express();
const port = process.env.PORT || 3000;

// Configurare conexiune Redis
const cache = redis.createClient({ url: 'redis://redis:6379' });
cache.connect().catch(err => console.error('Eroare la conectarea cu Redis:', err));

// Configurare conexiune Cassandra
const cassandraClient = new cassandra.Client({
    contactPoints: ['cassandra1', 'cassandra2'], // Nodurile Cassandra
    localDataCenter: 'datacenter1', // Nume implicit al datacenterului
});

// Verificare conexiune Cassandra
cassandraClient.connect()
    .then(() => console.log('Conectat la clusterul Cassandra'))
    .catch(err => console.error('Eroare la conectarea cu Cassandra:', err));

// Creare keyspace și tabel în Cassandra (o singură dată la pornire)
cassandraClient.execute(`
    CREATE KEYSPACE IF NOT EXISTS test_keyspace
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 2};
`).then(() => {
    return cassandraClient.execute(`
        CREATE TABLE IF NOT EXISTS test_keyspace.messages (
            id UUID PRIMARY KEY,
            message TEXT
        );
    `);
}).then(() => {
    console.log('Keyspace și tabel create cu succes în Cassandra.');
}).catch(err => console.error('Eroare la crearea keyspace-ului sau tabelului:', err));

// Endpoint principal
app.get('/', async (req, res) => {
    try {
        const cacheKey = `message:${port}`; // Mesaj unic pentru fiecare port
        const cachedData = await cache.get(cacheKey);

        const message = cachedData
            ? cachedData // Dacă există în cache, folosim mesajul
            : `Salut! Aceasta este instanța care rulează pe portul ${port}.`;

        if (!cachedData) {
            // Dacă nu există în cache, salvăm mesajul
            await cache.set(cacheKey, message, { EX: 10 }); // Expiră în 10 secunde

            // Salvăm mesajul și în Cassandra
            const query = `INSERT INTO test_keyspace.messages (id, message) VALUES (uuid(), ?)`;
            await cassandraClient.execute(query, [message], { prepare: true });
        }

        // Generăm răspunsul HTML cu stilizare
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
                        background-color: #f8d2ea; /* Culoare fundal */
                    }
                    h1 {
                        color: #333; /* Culoare text */
                        text-align: center;
                        font-size: 24px; /* Ajustează dimensiunea textului aici */
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

app.listen(port, () => {
    console.log(`Serverul funcționează pe portul ${port}`);
});
