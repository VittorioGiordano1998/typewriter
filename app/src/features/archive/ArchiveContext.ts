import { createContext, useContext } from 'react'
import type { Archive } from './archive'

export const ArchiveContext = createContext<Archive | null>(null)

export function useArchive(): Archive {
  const archive = useContext(ArchiveContext)
  if (!archive) throw new Error('useArchive must be used inside an ArchiveContext provider')
  return archive
}
