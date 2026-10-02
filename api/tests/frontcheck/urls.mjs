import { rolldown } from '../../../node_modules/rolldown/dist/index.mjs'

const RAIZ = new URL('../../../', import.meta.url).pathname

const stubFirebase = {
  name: 'stub-firebase',
  resolveId: (id) => (/lib\/firebase$/.test(id) ? '\0fb' : null),
  load: (id) =>
    id === '\0fb'
      ? 'export const auth = { currentUser: null, onAuthStateChanged: (cb) => { cb(null); return () => {} } }'
      : null,
}

const bundle = await rolldown({ input: `${RAIZ}src/api/client.ts`, plugins: [stubFirebase] })
const { output } = await bundle.generate({ format: 'esm' })

const codigo = output[0].code.replaceAll('import.meta.env.VITE_API_BASE_URL', '""')

globalThis.sessionStorage = { getItem: () => null, setItem: () => {} }
const chamadas = []
globalThis.fetch = async (url) => {
  chamadas.push(String(url))
  return { ok: true, json: async () => [] }
}

const api = await import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))

const P = { from: '2026-08-01', to: '2026-08-30' }
const TOPICO = '10-lula'
const CANDIDATO = 'lula'

await api.getEntities()
await api.getTopics()
await api.getCollectionStatus()
await api.getCandidateRegistry()
await api.getTopicSeries({ entityIds: [], networks: ['reddit'], period: P })
await api.getVolumeOverTime([CANDIDATO], P, [])
await api.getMentionsByNetwork([], P, [])
await api.getShareOfVoice([], P, [])
await api.getOverviewSummary([], P, [])
await api.getHighlights([], P, [])
await api.getTopicRanking([], P, [], 10)
await api.getTopicRanking([CANDIDATO], P, ['reddit', 'youtube'])
await api.getTopicDetail(TOPICO, [], P, ['reddit', 'youtube'])
await api.getTopicCandidateSeries(TOPICO, [], P, ['reddit', 'youtube'])
await api.getSentimentSeries(TOPICO, [], P, ['reddit', 'youtube'])
await api.getTopicDocuments(TOPICO, { networks: ['reddit', 'youtube'] })
await api.getTopicsBySubdivision([], P, 'reddit')
await api.getTopicsBySubdivision([], P, 'youtube')
await api.getCandidateSentimentBreakdown([], P, ['reddit'])
await api.getNetworkDocuments([], P, 'youtube')
await api.getComparisonSummary(CANDIDATO, P, ['reddit'])
await api.getNegativeSentimentOverTime([CANDIDATO], P, [])
await api.getCandidatePosts([], P, [])
await api.getCandidateContentSummary([], P, [])
await api.getAdTopicRanking([], P, [])
await api.getAdCandidateBreakdown([], P, [])
await api.getCandidateTopicList({
  entityId: CANDIDATO, network: 'reddit', period: P, search: 'sus', limit: 5,
})

for (const url of chamadas) console.log(url)
