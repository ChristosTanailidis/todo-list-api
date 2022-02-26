import 'reflect-metadata'

import { createServer } from 'http'
import Koa, { Context } from 'koa'
import cors from '@koa/cors'
import { ApolloServer } from 'apollo-server-koa'
import { buildSchema } from 'type-graphql'
import { MikroORM } from '@mikro-orm/core'

import { ENVIRONMENT, HOST, PORT } from './dependencies/config'

import { CustomContext } from './types/interfaces/CustomContext'

import { AutoRegister } from './middlewares/AutoRegister'
import { jwt } from './middlewares/Authentication'

import { CoreResolver } from './lib/resolvers/CoreResolver'
import { TaskResolver } from './lib/resolvers/TaskResolver'
import { ListResolver } from './lib/resolvers/ListResolver'

async function main (): Promise<void> {
  console.log(`ENVIRONMENT: ${ENVIRONMENT}`)
  console.log('=== SETUP DATABASE ===')
  const connection = await MikroORM.init()

  console.log('=== BUILDING GQL SCHEMA ===')
  const schema = await buildSchema({
    resolvers: [
      CoreResolver,
      TaskResolver,
      ListResolver
    ],
    globalMiddlewares: [AutoRegister]
  })

  const apolloServer = new ApolloServer({
    schema,
    context ({ ctx }: { ctx: Context }): CustomContext {
      return {
        ctx,
        state: ctx.state,
        em: connection.em.fork()
      }
    }
  })

  const app = new Koa()
  if (ENVIRONMENT === 'production') {
    app.proxy = true
  }

  await apolloServer.start()

  app.use(cors())

  app.use(jwt)

  app.use(apolloServer.getMiddleware({ cors: false }))
  const httpServer = createServer(app.callback())
  httpServer.listen({ port: PORT }, () => {
    console.log(`http://${HOST}:${PORT}/graphql`)
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
