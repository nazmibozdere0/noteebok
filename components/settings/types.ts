export interface SectionProps {
  onDirtyChange: (dirty: boolean) => void
  saveSignal: number
  cancelSignal: number
}
