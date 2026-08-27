export interface Entity {
  id: string
  name: string
  role: string
  aliases: string[]
  /** foto oficial, opcional — quando ausente o Avatar cai para iniciais */
  photoUrl?: string
}
