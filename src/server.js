import autoLoad from '@fastify/autoload'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import fastify from 'fastify'
import fastifyView from '@fastify/view'
import fastifyStatic from '@fastify/static'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fastifyFormbody from '@fastify/formbody'
import databasePlugin from './plugins/database.js'
import { Eta } from 'eta'

const app = fastify({
  logger: false,
  trustProxy: true
})
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const eta = new Eta()

app.register(fastifyCookie)

app.register(fastifySession, {
  secret: process.env.SESSION_SECRET || 'changez-moi-en-production-avec-une-cle-longue-et-aleatoire',
  cookie: {
    secure: 'auto',
    httpOnly: true,
    maxAge: 1800000,
    sameSite: 'lax',
    path: '/'
  },
  saveUninitialized: false,
  rolling: true
})

app.register(fastifyFormbody)

app.register(databasePlugin)

app.register(fastifyView, {
  engine: { eta },
  root: join(__dirname, 'views'),
  viewExt: 'eta'
})

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
