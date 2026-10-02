import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { readFileSync } from 'node:fs'

const [porta, ...arquivos] = process.argv.slice(2)

const db = typeof PGlite.create === 'function' ? await PGlite.create() : await new PGlite()

for (const arquivo of arquivos) {
  try {
    await db.exec(readFileSync(arquivo, 'utf8'))
  } catch (e) {
    console.error(`ERRO em ${arquivo}: ${e.message}`)
    process.exit(1)
  }
}

await new PGLiteSocketServer({ db, port: Number(porta), host: '127.0.0.1' }).start()
console.log('PRONTO')

process.on('uncaughtException', (e) => {
  console.error(`ERRO nao tratado: ${e.message}`)
  process.exit(1)
})
