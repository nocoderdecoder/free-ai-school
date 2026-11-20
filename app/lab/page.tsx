import { redirect } from 'next/navigation'

// Keep older portfolio links on the same reviewed project listing.
export default function Lab() {
  redirect('/projects')
}
