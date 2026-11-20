import { permanentRedirect } from 'next/navigation'

export default function LegacyPage() {
  permanentRedirect('/work#projects')
}
