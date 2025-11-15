import dotenv from 'dotenv' // Charger en premier

import Fastify from 'fastify'
import cors from '@fastify/cors'
import mysql from 'mysql2/promise'
dotenv.config()

const app = Fastify({ logger: true })

// Activer CORS pour permettre à uMap d'accéder à l'API
await app.register(cors, {
    origin: '*' // En production, limitez aux domaines autorisés
})

// Pool de connexions MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
})

// GET /api/geojson - Récupérer tous les POI en format GeoJSON
app.get('/api/geojson', async (request, reply) => {
    try {
        const [rows] = await pool.query(`
      SELECT 
        id,
        ST_AsGeoJSON(geometry) as geometry,
        properties
      FROM pilgrim_map
      ORDER BY id
    `)

        const geojson = {
            type: 'FeatureCollection',
            features: rows.map(row => ({
                type: 'Feature',
                id: row.id,
                geometry: row.geometry,
                properties: row.properties
            }))

        }

        reply
            .type('application/geo+json')
            .send(geojson)
    } catch (error) {
        console.error('❌ Erreur détaillée:', error)
        app.log.error(error)
        reply.code(500).send({
            error: 'Erreur serveur',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
})

// Lancer le serveur
const start = async () => {
    try {
        // Test de connexion MySQL
        console.log('🔌 Test de connexion MySQL...')
        const connection = await pool.getConnection()
        console.log('✅ Connexion MySQL réussie')

        const [count] = await connection.query('SELECT COUNT(*) as total FROM pilgrim_map')
        console.log(`✅ ${count[0].total} POI dans la base`)
        connection.release()

        const port = process.env.PORT || 3000
        await app.listen({ port, host: '0.0.0.0' })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

start()
