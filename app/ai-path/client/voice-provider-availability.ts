export type VoiceProviderAvailability = Readonly<{
  status: 'available' | 'unavailable'
  canStart: boolean
  message: string
}>

export const VOICE_PROVIDER_UNAVAILABLE: VoiceProviderAvailability = Object.freeze({
  status: 'unavailable',
  canStart: false,
  message: 'Live voice is not enabled yet. You can test your microphone locally or continue by typing.',
})

/**
 * A client may call this only with server-reviewed capability state. Realtime is
 * presented as available only when both the client integration and server
 * provider boundary are explicitly ready.
 */
export function resolveVoiceProviderAvailability(input: Readonly<{
  clientReady: boolean
  serverReady: boolean
}>): VoiceProviderAvailability {
  if (!input.clientReady || !input.serverReady) return VOICE_PROVIDER_UNAVAILABLE
  return Object.freeze({
    status: 'available',
    canStart: true,
    message: 'Live voice is available. Your microphone starts only when you choose Start conversation.',
  })
}
