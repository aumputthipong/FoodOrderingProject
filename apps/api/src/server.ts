import { createApp } from './app'
import { env } from './config/env'
import { closeDb } from './db/client'

const server = createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`)
})

function shutdown(): void {
  server.close(() => {
    closeDb().then(
      () => process.exit(0),
      (err: unknown) => {
        console.error(err)
        process.exit(1)
      },
    )
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
