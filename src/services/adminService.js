import { pool } from '../utils/database.js'

export async function getAllPilgrimSites() {
  try {
    const [rows] = await pool.query(
      'SELECT name, category FROM pilgrim_map ORDER BY name ASC'
    )
    return rows
  } catch (error) {
    console.error('Erreur lors de la récupération des sites:', error)
    throw error
  }
}

export async function getPilgrimSiteById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM pilgrim_map WHERE id = ?',
      [id]
    )
    return rows[0] || null
  } catch (error) {
    console.error('Erreur lors de la récupération du site:', error)
    throw error
  }
}