import fp from 'fastify-plugin'
import { pool } from '../utils/database.js'

async function databasePlugin (fastify, options) {
  fastify.decorate('db', {
    // Pour le login
    async getUser (username) {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      )
      return rows[0] || null
    },

    // Pour l'admin dashboard
    async getStats () {
      // TODO: Adapter selon votre structure de BDD
      const [pilgrimsCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM pilgrims'
      )

      return {
        totalPilgrims: pilgrimsCount[0]?.count || 0
        // Ajoutez d'autres stats si nécessaire
      }
    },

    // Pour gérer les pèlerins
    async getAllPilgrims () {
      const [rows] = await pool.execute(
        'SELECT * FROM pilgrims ORDER BY created_at DESC'
      )
      return rows
    },

    async addPilgrim (data) {
      const { name, email, startLocation, endLocation } = data
      const [result] = await pool.execute(
        'INSERT INTO pilgrims (name, email, start_location, end_location) VALUES (?, ?, ?, ?)',
        [name, email, startLocation, endLocation]
      )
      return result
    },

    async deletePilgrim (id) {
      const [result] = await pool.execute(
        'DELETE FROM pilgrims WHERE id = ?',
        [id]
      )
      return result
    }
  })
}

export default fp(databasePlugin)
