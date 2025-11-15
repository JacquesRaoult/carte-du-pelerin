import Fastify from 'fastify'
import cors from '@fastify/cors'
import mysql from 'mysql2/promise'

const fastify = Fastify({ logger: true })

// Activer CORS pour permettre à uMap d'accéder à l'API
await fastify.register(cors, {
  origin: '*' // En production, limitez aux domaines autorisés
})

// Pool de connexions MySQL
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10
})

// GET /api/geojson - Récupérer tous les POI en format GeoJSON
fastify.get('/api/geojson', async (request, reply) => {
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
        geometry: JSON.parse(row.geometry),
        properties: JSON.parse(row.properties)
      }))
    }

    reply
      .type('application/geo+json')
      .send(geojson)
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({ error: 'Erreur serveur' })
  }
})

// GET /api/features/:id - Récupérer un POI spécifique
fastify.get('/api/features/:id', async (request, reply) => {
  try {
    const { id } = request.params

    const [rows] = await pool.query(`
      SELECT 
        id,
        ST_AsGeoJSON(geometry) as geometry,
        properties
      FROM pilgrim_map
      WHERE id = ?
    `, [id])

    if (rows.length === 0) {
      return reply.code(404).send({ error: 'Feature non trouvée' })
    }

    const feature = {
      type: 'Feature',
      id: rows[0].id,
      geometry: JSON.parse(rows[0].geometry),
      properties: JSON.parse(rows[0].properties)
    }

    reply.send(feature)
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({ error: 'Erreur serveur' })
  }
})

// POST /api/features - Ajouter un nouveau POI
fastify.post('/api/features', async (request, reply) => {
  try {
    const { geometry, properties } = request.body

    const [result] = await pool.query(`
      INSERT INTO pilgrim_map (geometry, properties)
      VALUES (ST_GeomFromGeoJSON(?), ?)
    `, [
      JSON.stringify(geometry),
      JSON.stringify(properties)
    ])

    reply.code(201).send({
      success: true,
      id: result.insertId
    })
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({ error: 'Erreur lors de la création' })
  }
})

// PUT /api/features/:id - Modifier un POI
fastify.put('/api/features/:id', async (request, reply) => {
  try {
    const { id } = request.params
    const { geometry, properties } = request.body

    const [result] = await pool.query(`
      UPDATE pilgrim_map 
      SET geometry = ST_GeomFromGeoJSON(?),
          properties = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [
      JSON.stringify(geometry),
      JSON.stringify(properties),
      id
    ])

    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'Feature non trouvée' })
    }

    reply.send({ success: true })
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({ error: 'Erreur lors de la modification' })
  }
})

// DELETE /api/features/:id - Supprimer un POI
fastify.delete('/api/features/:id', async (request, reply) => {
  try {
    const { id } = request.params

    const [result] = await pool.query(
      'DELETE FROM pilgrim_map WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'Feature non trouvée' })
    }

    reply.send({ success: true })
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({ error: 'Erreur lors de la suppression' })
  }
})

// Lancer le serveur
const start = async () => {
  try {
    const port = process.env.PORT || 3000
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Serveur démarré sur http://localhost:${port}`)
    console.log(`📍 GeoJSON disponible sur http://localhost:${port}/api/geojson`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
