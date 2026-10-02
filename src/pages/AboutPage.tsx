import {
  Target,
  Info,
  LayoutDashboard,
  Play,
  MessageSquare,
  Megaphone,
  Scale,
  Code2,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconTile } from '../components/ui/IconTile'
import type { IconTone } from '../components/ui/IconTile'
import { usePageHeader } from '../context/PageHeaderContext'

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

function FeatureTile({
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

export function AboutPage() {
  usePageHeader(
    'Sobre o Projeto',
    'Conheça o PAVE, a ferramenta de inteligência artificial para análise do debate digital',
  )

  return (
    <div className="flex flex-col gap-6">
      <Card
        icon={Info}
        tone="blue"
        title="O que é o PAVE?"
        subtitle="Uma plataforma web desenvolvida para acompanhar o debate sobre a eleição presidencial."
      >
        <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
          A ferramenta reúne enormes volumes de dados públicos e utiliza inteligência artificial para extrair sentido dessas informações. Com o PAVE, é possível visualizar o <strong>volume de menções</strong> ao longo do tempo, a <strong>participação dos candidatos</strong> nessas conversas, os <strong>sentimentos associados</strong> a eles e os <strong>principais tópicos</strong> discutidos em cada ambiente da internet.
        </p>
      </Card>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          icon={Target}
          tone="purple"
          title="Objetivo e Público"
        >
          <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            A proposta é oferecer uma visão estruturada do debate eleitoral nas redes, apoiando análises sobre narrativas digitais, comunicação política e comportamento do eleitor. A plataforma foi pensada para ser uma ferramenta útil para <strong>jornalistas, pesquisadores e analistas</strong> interessados em investigar a dinâmica das eleições nas redes sociais.
          </p>
          <div className="flex items-start gap-3 rounded-[13px] border border-[var(--tint-green)] bg-[var(--tint-green)] p-4">
            <ShieldCheck size={24} className="shrink-0 text-[var(--color-green)]" />
            <div>
              <p className="text-xs font-bold text-[var(--tint-text-green)]">
                Iniciativa Imparcial
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--tint-text-green)]">
                O projeto <strong>não tem como objetivo</strong> indicar preferência política ou avaliar candidatos individualmente, mas sim compreender puramente como o debate público se organiza nas plataformas digitais.
              </p>
            </div>
          </div>
        </Card>

        <Card
          icon={Code2}
          tone="graphite"
          title="Por trás da tecnologia"
        >
          <ul className="flex flex-col gap-3 text-[13px] text-[var(--text-secondary)]">
            <li className="flex items-start gap-2.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-graphite)]" />
              <span>
                <strong>Coleta Automatizada:</strong> Uso das APIs YouTube v3 (para canais de notícias), Arctic Shift (para subreddits específicos) e Ad Library API (para anúncios da Meta).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-graphite)]" />
              <span>
                <strong>Inteligência Artificial:</strong> Modelagem de tópicos feita a partir de grupos semânticos e classificação de sentimentos.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-graphite)]" />
              <span>
                <strong>Equipe:</strong> O desenvolvimento completo das rotinas de extração, modelagem, sumarização via IA e da interface web envolveu o trabalho ativo de <strong>13 estudantes</strong> da Universidade Federal de São João del Rei (UFSJ).
              </span>
            </li>
          </ul>
        </Card>
      </section>

      <Card
        icon={LayoutDashboard}
        tone="amber"
        title="O que você encontra aqui"
        subtitle="A plataforma é dividida em módulos focados em diferentes perspectivas do cenário digital."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureTile
            icon={LayoutDashboard}
            tone="purple"
            title="Visão Geral"
            body="Mostra métricas macro de menções, sentimento dominante e o ranking de assuntos do momento agrupando todas as redes."
          />
          <FeatureTile
            icon={Play}
            tone="coral"
            title="YouTube"
            body="Foco nos comentários públicos. Permite observar o que os usuários dizem segmentado por canais jornalísticos específicos."
          />
          <FeatureTile
            icon={MessageSquare}
            tone="amber"
            title="Reddit"
            body="Análise profunda das comunidades. Acompanha as publicações e as discussões políticas nos principais subreddits do Brasil."
          />
          <FeatureTile
            icon={Megaphone}
            tone="blue"
            title="Meta Ads"
            body="Foco no que o candidato posta (Facebook/Instagram). Acompanha temas de campanha e investimento financeiro declarado."
          />
        </div>
        <div className="mt-4">
          <FeatureTile
            icon={Scale}
            tone="graphite"
            title="Comparativo"
            body="Coloca os candidatos lado a lado em uma mesma escala para evidenciar contrastes no volume de atenção, mudança de humor e participação da voz ao longo do tempo."
          />
        </div>
      </Card>
    </div>
  )
}