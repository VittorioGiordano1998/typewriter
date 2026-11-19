import { useI18n } from '../features/i18n/context'
import { Panel } from './Panel'

interface Props {
  onClose(): void
}

export function CreditsPanel({ onClose }: Props) {
  const { t } = useI18n()
  return (
    <Panel title={t.creditsTitle} onClose={onClose} placement="center">
      <div className="space-y-3 text-paper/85">
        <p>{t.creditsIntro}</p>
        <p>{t.creditsSounds}</p>
        <p>{t.creditsModel}</p>
        <p>{t.creditsFonts}</p>
      </div>
    </Panel>
  )
}
