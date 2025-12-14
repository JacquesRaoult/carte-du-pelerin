import { getAllPilgrimSites } from '../services/adminService.js'

export default async function (fastify, opts) {
  // Middleware de vérification d'authentification pour toutes les routes admin
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.session?.user) {
      return reply.redirect('/login')
    }
  })

  // Page principale du panneau admin
  fastify.get('/admin', async (request, reply) => {
    const user = request.session.user

    try {
      const sites = await getAllPilgrimSites()
      
      return reply.view('admin.eta', {
        user,
        sites
      })
    } catch (error) {
      fastify.log.error('Erreur lors du chargement des sites:', error)
      return reply.view('admin.eta', {
        user,
        sites: [],
        error: 'Erreur lors du chargement des données'
      })
    }
  })

  // Route de déconnexion
  fastify.get('/admin/logout', async (request, reply) => {
    request.session.destroy()
    return reply.redirect('/login')
  })
}