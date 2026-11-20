import { permanentRedirect } from 'next/navigation'

export default function LegacyPage() {
  permanentRedirect('/speaking#contact')
}
