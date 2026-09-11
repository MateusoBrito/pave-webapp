import { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';

interface HashtagItem {
  hashtag: string;
  contagem: number;
  fonte_codigo: string;
}

interface Entity {
  id: string;
  name: string;
}

interface UnifiedHashtagCloudProps {
  entities: Entity[];
}

// Mapeamento exato de cores baseado no padrão dos gráficos de share/rede
const CANDIDATE_COLOR_MAP: { [key: string]: { border: string; badge: string } } = {
  'augusto_cury': { 
    border: 'border-l-blue-500', 
    badge: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200' 
  },
  'flavio_bolsonaro': { 
    border: 'border-l-amber-500', 
    badge: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' 
  },
  'lula': { 
    border: 'border-l-teal-600', 
    badge: 'bg-teal-50 text-teal-800 hover:bg-teal-100 border-teal-200' 
  },
  'renan_santos': { 
    border: 'border-l-emerald-500', 
    badge: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' 
  },
};

const DEFAULT_COLOR = { 
  border: 'border-l-indigo-500', 
  badge: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200' 
};

export function HashtagCloud({ entities }: UnifiedHashtagCloudProps) {
  const [dataPorCandidato, setDataPorCandidato] = useState<{ [key: string]: { name: string; hashtags: HashtagItem[] } }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entities || entities.length === 0) {
      setDataPorCandidato({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    Promise.all(
      entities.map((entity) =>
        fetch(`${baseUrl}/hashtags/${entity.id}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((data: HashtagItem[]) => ({
            id: entity.id,
            name: entity.name,
            hashtags: data.slice(0, 15),
          }))
          .catch(() => ({ id: entity.id, name: entity.name, hashtags: [] }))
      )
    )
      .then((results) => {
        const novoMapa: { [key: string]: { name: string; hashtags: HashtagItem[] } } = {};
        results.forEach((item) => {
          novoMapa[item.id] = { name: item.name, hashtags: item.hashtags };
        });
        setDataPorCandidato(novoMapa);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar hashtags:', err);
        setLoading(false);
      });
  }, [entities]);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse mb-6 w-full">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-100 rounded-md w-20"></div>
          <div className="h-6 bg-gray-100 rounded-md w-28"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 w-full">
      <h3 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
          <Hash className="w-4 h-4" />
        </span>
        <span>Hashtags mais frequentes por candidato</span>
      </h3>

      <div className="space-y-6">
        {entities.map((entity) => {
          const candidatoData = dataPorCandidato[entity.id];
          const hashtags = candidatoData ? candidatoData.hashtags : [];
          const style = CANDIDATE_COLOR_MAP[entity.id] || DEFAULT_COLOR;

          return (
            <div 
              key={entity.id} 
              className={`pl-4 border-l-4 ${style.border} pb-5 border-b border-gray-100 last:border-b-0 last:pb-0`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  {entity.name}
                </h4>
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  Top {hashtags.length}
                </span>
              </div>

              {hashtags.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nenhuma hashtag registrada para este candidato.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hashtags.map(({ hashtag, contagem }) => (
                    <span
                      key={hashtag}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-default flex items-center gap-1.5 ${style.badge}`}
                      title={`Citada ${contagem} vezes`}
                    >
                      <span>{hashtag}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/90 text-gray-700 font-semibold shadow-2xs">
                        {contagem}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}