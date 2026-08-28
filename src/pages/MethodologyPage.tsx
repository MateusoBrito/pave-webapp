import {
  AlertTriangle,
  Check,
  Database,
  History,
  Layers,
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Percent,
  Play,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconTile } from '../components/ui/IconTile'
import type { IconTone } from '../components/ui/IconTile'
import { usePageHeader } from '../context/PageHeaderContext'
import { sentimentColor } from '../lib/colors'
import type { SentimentLabel } from '../types'

function Card({
  icon,
  tone,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon
  tone: IconTone
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl bg-[var(--chart-surface)] p-6"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} size={34} />
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function QuestionTile({
  icon,
  tone,
  title,
  body,
}: {
  icon: LucideIcon
  tone: IconTone
  title: string
  body: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-2.5 rounded-[14px] border border-[var(--gridline)] bg-[var(--page-plane)] p-[18px]">
      <IconTile icon={icon} tone={tone} size={38} />
      <p className="text-[13px] font-bold text-[var(--text-primary)]">{title}</p>
      <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">{body}</p>
    </div>
  )
}

const NETWORK_ICON: Record<string, LucideIcon> = {
  youtube: Play,
  reddit: MessageSquare,
  meta_ads: Megaphone,
}
const NETWORK_TONE: Record<string, IconTone> = {
  youtube: 'coral',
  reddit: 'amber',
  meta_ads: 'blue',
}

const SOURCES = [
  {
    network: 'youtube',
    name: 'YouTube',
    collected: 'Comentários em vídeos dos canais oficiais dos candidatos',
    how: 'Data API v3',
    limitation: 'Quota diária limitada: dias de pico podem vir amostrados',
  },
  {
    network: 'reddit',
    name: 'Reddit',
    collected: 'Publicações e comentários em subreddits brasileiros selecionados',
    how: 'Arctic Shift',
    limitation: 'O recorte depende de quais subreddits entram na lista',
  },
  {
    network: 'meta_ads',
    name: 'Meta Ads',
    collected: 'Anúncios pagos declarados no Facebook e no Instagram',
    how: 'Ad Library API',
    limitation:
      'Investimento e alcance vêm em faixas; a imagem do anúncio não é fornecida',
  },
]

const STEPS = [
  {
    title: 'Limpeza e normalização',
    body: 'Pré-processamento textual, URLs e menções tratadas.',
  },
  {
    title: 'Representação do texto',
    body: 'Cada documento vira um vetor por embeddings, que aproxima textos de sentido parecido.',
  },
  {
    title: 'Agrupamento com BERTopic',
    body: 'Um modelo por rede, porque a linguagem das redes são diferentes.',
  },
  {
    title: 'Rotulagem revisada',
    body: 'O nome do tópico é gerado e revisado. "Tópico 37" não serve para o painel.',
  },
]

const SENTIMENT_CLASSES: {
  key: SentimentLabel
  label: string
  bg: string
  text: string
}[] = [
  {
    key: 'negative',
    label: 'Negativo',
    bg: 'var(--tint-coral)',
    text: 'var(--tint-text-coral)',
  },
  {
    key: 'neutral',
    label: 'Neutro',
    bg: 'var(--tint-graphite)',
    text: 'var(--text-secondary)',
  },
  {
    key: 'positive',
    label: 'Positivo',
    bg: 'var(--tint-green)',
    text: 'var(--tint-text-green)',
  },
]

const LIMITATIONS = [
  {
    title: 'Ironia e sarcasmo',
    body: 'Linguagem política é cheia dos dois, e o erro do classificador tende a ser sistemático, não aleatório.',
  },
  {
    title: 'Alvo do sentimento',
    body: 'O modelo diz que o texto é negativo, mas não diz negativo sobre quem ou sobre o quê.',
  },
  {
    title: 'Amostragem por quota',
    body: 'No YouTube, dias de pico podem vir incompletos por limite diário da API.',
  },
  {
    title: 'Faixas em vez de valores',
    body: 'Investimento e alcance de anúncios são intervalos declarados pela Meta, não medições.',
  },
  {
    title: 'Tópicos não são comparáveis',
    body: 'Cada candidato tem seu próprio conjunto de temas. Não existe "o mesmo tópico" nos dois lados.',
  },
]

const PRIVACY_ITEMS = [
  {
    title: 'Somente conteúdo público',
    body: 'Nada que exija login, contorno de bloqueio ou raspagem fora dos termos da plataforma.',
  },
  {
    title: 'Anonimização na exibição',
    body: 'Autores aparecem sem identificação nas telas e nas exportações.',
  },
]

const VERSIONS = [
  { label: 'Modelo de tópicos', value: 'v7 · re-modelado em 01/07/2026' },
  { label: 'Próxima re-modelagem', value: '01/08/2026' },
  { label: 'Modelo de sentimento', value: 'a definir por benchmark · Fase 4' },
  { label: 'Última coleta concluída', value: '02/08/2026 · sem lacunas em julho' },
  { label: 'Candidatos monitorados', value: 'Lula e Flávio Bolsonaro' },
]

export function MethodologyPage() {
  usePageHeader(
    'Metodologia',
    'De onde vêm os dados, como são tratados e o que este painel não consegue dizer',
  )

  return (
    <>
      <Card
        icon={MessageCircle}
        tone="purple"
        title="O que este painel mostra"
        subtitle="O PAVE acompanha a conversa pública sobre candidatos das eleições de 2026 em redes sociais. Ele responde a três perguntas para qualquer recorte de período e rede."
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <QuestionTile
            icon={MessageCircle}
            tone="purple"
            title="Sobre o que estão falando?"
            body="Tópicos dominantes e como eles surgem, crescem e somem ao longo do tempo."
          />
          <QuestionTile
            icon={Check}
            tone="green"
            title="Como estão falando?"
            body="Sentimento dos comentários em negativo, neutro e positivo, por tema e por rede."
          />
          <QuestionTile
            icon={Megaphone}
            tone="blue"
            title="O que os candidatos dizem?"
            body="Conteúdo pago publicado pelos próprios candidatos, com investimento declarado."
          />
        </div>
      </Card>

      <Card
        icon={Database}
        tone="blue"
        title="Fontes de dados"
        subtitle="Somente conteúdo público, coletado por APIs."
      >
        {/* tabela — telas médias pra cima */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_2fr_1fr_2fr] gap-4 rounded-lg bg-[var(--page-plane)] px-3.5 py-2.5 text-[9px] font-bold tracking-[0.7px] text-[var(--text-muted)] uppercase">
            <p>Fonte</p>
            <p>O que é coletado</p>
            <p>Como</p>
            <p>Limitação conhecida</p>
          </div>
          {SOURCES.map((source, index) => (
            <div key={source.network}>
              <div className="grid grid-cols-[1fr_2fr_1fr_2fr] gap-4 px-3.5 py-3.5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <IconTile
                      icon={NETWORK_ICON[source.network]}
                      tone={NETWORK_TONE[source.network]}
                      size={24}
                    />
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {source.name}
                    </p>
                  </div>
                  <span className="flex w-fit items-center gap-1.5 rounded-md bg-[var(--tint-green)] px-2 py-1 text-[9px] font-bold text-[var(--tint-text-green)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-green)]" />
                    Ativa
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {source.collected}
                </p>
                <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {source.how}
                </p>
                <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {source.limitation}
                </p>
              </div>
              {index < SOURCES.length - 1 && (
                <div className="h-px bg-[var(--gridline)]" />
              )}
            </div>
          ))}
        </div>

        {/* cartões — mobile, pra não esconder colunas atrás de rolagem horizontal */}
        <div className="flex flex-col gap-3 md:hidden">
          {SOURCES.map((source) => (
            <div
              key={source.network}
              className="flex flex-col gap-2.5 rounded-[14px] border border-[var(--gridline)] bg-[var(--page-plane)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconTile
                    icon={NETWORK_ICON[source.network]}
                    tone={NETWORK_TONE[source.network]}
                    size={24}
                  />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {source.name}
                  </p>
                </div>
                <span className="flex w-fit items-center gap-1.5 rounded-md bg-[var(--tint-green)] px-2 py-1 text-[9px] font-bold text-[var(--tint-text-green)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-green)]" />
                  Ativa
                </span>
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.6px] text-[var(--text-muted)] uppercase">
                  O que é coletado
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {source.collected}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.6px] text-[var(--text-muted)] uppercase">
                  Como
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {source.how}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.6px] text-[var(--text-muted)] uppercase">
                  Limitação conhecida
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {source.limitation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          icon={Layers}
          tone="purple"
          title="Como os temas são identificados"
          subtitle="Nenhum tema é definido à mão. Eles emergem do próprio texto, e depois recebem um nome legível."
        >
          <div className="flex flex-col gap-3.5">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex items-start gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] bg-[var(--tint-primary)] text-[11px] font-bold text-[var(--color-primary)]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          icon={Percent}
          tone="blue"
          title="Como o sentimento é classificado"
          subtitle="Cada comentário recebe uma de três classes."
        >
          <div className="flex gap-2.5">
            {SENTIMENT_CLASSES.map((c) => (
              <span
                key={c.key}
                className="flex flex-1 items-center justify-center gap-2 rounded-[11px] p-3 text-xs font-bold"
                style={{ backgroundColor: c.bg, color: c.text }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: sentimentColor(c.key) }}
                />
                {c.label}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-green)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Só Reddit e YouTube
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  Anúncios da Meta são conteúdo do próprio candidato: não há reação
                  pública para classificar.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <X size={16} className="mt-0.5 shrink-0 text-[var(--color-coral)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Não mede intensidade
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  &ldquo;Detesto&rdquo; e &ldquo;não gostei&rdquo; caem os dois em
                  negativo. Não há escala.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <Card icon={AlertTriangle} tone="amber" title="Limitações conhecidas">
        <div className="flex flex-wrap gap-3.5">
          {LIMITATIONS.map((item) => (
            <div
              key={item.title}
              className="flex w-full flex-1 basis-[320px] items-start gap-3 rounded-[13px] border border-[var(--tint-amber)] bg-[var(--tint-amber)] p-4"
            >
              <IconTile icon={AlertTriangle} tone="amber" size={32} />
              <div>
                <p className="text-xs font-bold text-[var(--tint-text-amber)]">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--tint-text-amber)]">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          icon={Lock}
          tone="purple"
          title="Dados pessoais e uso responsável"
          subtitle="Coletamos apenas o que é público, pelo caminho oficial de cada plataforma."
        >
          <div className="flex flex-col gap-3.5">
            {PRIVACY_ITEMS.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <IconTile icon={Lock} tone="purple" size={30} />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card icon={History} tone="graphite" title="Versões e atualização">
          <div className="flex flex-col">
            {VERSIONS.map((v, index) => (
              <div key={v.label}>
                <div className="flex items-center justify-between gap-4 py-3 text-[11px]">
                  <p className="font-medium text-[var(--text-muted)]">{v.label}</p>
                  <p className="text-right font-semibold text-[var(--text-primary)]">
                    {v.value}
                  </p>
                </div>
                {index < VERSIONS.length - 1 && (
                  <div className="h-px bg-[var(--gridline)]" />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled
            title="Histórico de modelos ainda não existe"
            className="flex w-fit cursor-not-allowed items-center gap-2 rounded-lg bg-[var(--tint-primary)] px-3.5 py-2.5 text-[11px] font-semibold text-[var(--color-primary-dark)] opacity-70"
          >
            <History size={13} />
            Ver histórico de mudanças de modelo
          </button>
        </Card>
      </section>
    </>
  )
}
