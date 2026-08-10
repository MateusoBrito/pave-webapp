import { getTopics } from '../../api/client'
import { useFilters } from '../../context/FiltersContext'
import { useAsync } from '../../hooks'

export function TopicSelect() {
  const { topicId, setTopicId } = useFilters()
  const { data: topics = [] } = useAsync(() => getTopics(), [])

  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Tópico
      </label>
      <select
        value={topicId ?? 'all'}
        onChange={(e) =>
          setTopicId(e.target.value === 'all' ? undefined : e.target.value)
        }
        className="min-w-[170px] rounded-lg border border-[var(--baseline)] bg-[var(--chart-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
      >
        <option value="all">Todos</option>
        {topics.map((topic) => (
          <option key={topic.id} value={topic.id}>
            {topic.label}
          </option>
        ))}
      </select>
    </div>
  )
}
