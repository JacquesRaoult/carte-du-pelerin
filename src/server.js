import autoLoad from '@fastify/autoload'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import fastify from 'fastify'
import fastifyView from '@fastify/view'
import fastifyStatic from '@fastify/static'
import { Eta } from 'eta'

const app = fastify({ logger: true })
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const eta = new Eta()

app.register(fastifyView, {
    engine: { eta },
    root: join(__dirname, 'views'),
    viewExt: 'eta'
})

// Servir dossier public
app.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/',
    decorateReply: false
})

app.register(autoLoad, {
    dir: join(__dirname, 'routes')
})

app.register(autoLoad, {
    dir: join(__dirname, 'api')
})

const start = async () => {
    try {
        const port = process.env.PORT || 3000
        await app.listen({ port, host: '0.0.0.0' })
        console.log(`Serveur lancé sur le port ${port}`)
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

start()