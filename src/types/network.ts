export type Network = 'youtube' | 'reddit' | 'meta_ads'

export const NETWORKS: { id: Network; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'meta_ads', label: 'Meta Ads' },
]
