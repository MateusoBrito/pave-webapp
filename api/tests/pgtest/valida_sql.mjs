import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const [consultasPath, ...arquivos] = process.argv.slice(2)
const db = typeof PGlite.create === 'function' ? await PGlite.create() : await new PGlite()
for (const a of arquivos) await db.exec(readFileSync(a, 'utf8'))

const consultas = JSON.parse(readFileSync(consultasPath, 'utf8'))
let falhas = 0
for (const [nome, sql] of Object.entries(consultas)) {
  try {
    const r = await db.query(sql)
    const v = Object.values(r.rows[0] ?? {})[0]
    console.log(`  ok    ${nome.padEnd(30)} ${v}`)
  } catch (e) {
    console.log(`  ERRO  ${nome.padEnd(30)} ${e.message}`)
    falhas++
  }
}
process.exit(falhas ? 1 : 0)
