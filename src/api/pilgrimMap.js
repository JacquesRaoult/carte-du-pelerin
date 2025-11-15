import cors from '@fastify/cors'
import { pool } from '../services/database.js'

export default async function (fastify, opts) {
  await fastify.register(cors, {
    origin: '*'
  })

  fastify.get('/api/geojson', async (request, reply) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          id,
          ST_AsGeoJSON(geometry) as geometry,
          name,
          category,
          description
        FROM pilgrim_map
        ORDER BY id
      `)

      const geojson = {
        type: 'FeatureCollection',
        features: rows.map(row => ({
          type: 'Feature',
          id: row.id,
          geometry: row.geometry,
          properties: {
            name: row.name,
            category : row.category,
            description: row.description
          }
        }))
      }

      reply
        .type('application/geo+json')
        .send(geojson)
    } catch (error) {
      console.error('❌ Erreur détaillée:', error)
      fastify.log.error(error)
      reply.code(500).send({
        error: 'Erreur serveur',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  })
}