import { createBrowserRealtimeDependencies } from './realtime-browser-dependencies.ts'

/**
 * Carries the locally reviewed microphone choice into the dormant Realtime
 * adapter. Creating these dependencies does not request microphone permission
 * or perform a network call; the existing provider latch still governs use.
 */
export function createVoiceReadyBrowserDependencies(input: Readonly<{
  assessmentSessionId: string
  remoteAudio: Pick<HTMLAudioElement, 'autoplay' | 'pause' | 'play' | 'srcObject'>
  selectedDeviceId?: string
  endpoint?: string
  fetch?: typeof globalThis.fetch
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  createPeerConnection?: () => RTCPeerConnection
}>) {
  const getUserMedia = input.getUserMedia
    ?? (constraints => navigator.mediaDevices.getUserMedia(constraints))
  const selectedDeviceId = input.selectedDeviceId?.trim() ?? ''
  return createBrowserRealtimeDependencies({
    assessmentSessionId: input.assessmentSessionId,
    remoteAudio: input.remoteAudio,
    endpoint: input.endpoint,
    fetch: input.fetch,
    createPeerConnection: input.createPeerConnection,
    getUserMedia: () => getUserMedia({
      audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      video: false,
    }),
  })
}
