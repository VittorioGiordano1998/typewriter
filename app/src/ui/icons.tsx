import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const SheetsIcon = () => (
  <Icon>
    <path d="M8 3h9a2 2 0 0 1 2 2v12" />
    <rect x="4" y="6" width="12" height="15" rx="2" />
    <path d="M7.5 11h5M7.5 14.5h5" />
  </Icon>
)
export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)
export const ExportIcon = () => (
  <Icon>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M5 19h14" />
  </Icon>
)
export const SlidersIcon = () => (
  <Icon>
    <path d="M5 7h9M18 7h1M5 17h1M10 17h9" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Icon>
)
export const InfoIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
)
export const PencilIcon = () => (
  <Icon>
    <path d="M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16l-1 4z" />
  </Icon>
)
export const TrashIcon = () => (
  <Icon>
    <path d="M5 7h14M10 4h4M7 7l1 13h8l1-13M10 11v5M14 11v5" />
  </Icon>
)
export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
