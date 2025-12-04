import clickChangeUrl from '@/assets/sounds/click-change.mp3'
import modalCloseUrl from '@/assets/sounds/modal-close.wav'
import confirmDeleteUrl from '@/assets/sounds/confirm-delete.wav'
import errorUrl from '@/assets/sounds/error.wav'
import infoUrl from '@/assets/sounds/info.wav'
import successUrl from '@/assets/sounds/success.wav'

type SoundType = 
  | 'click-change'
  | 'modal-close'
  | 'confirm-delete'
  | 'error'
  | 'info'
  | 'success'

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map()
  private static instance: SoundManager
  private isMuted: boolean = false

  private constructor() {
    // Preload sounds
    this.preload('click-change', clickChangeUrl)
    this.preload('modal-close', modalCloseUrl)
    this.preload('confirm-delete', confirmDeleteUrl)
    this.preload('error', errorUrl)
    this.preload('info', infoUrl)
    this.preload('success', successUrl)
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  private preload(key: SoundType, path: string) {
    try {
      const audio = new Audio(path)
      audio.preload = 'auto'
      this.sounds.set(key, audio)
    } catch (error) {
      console.warn(`Failed to preload sound: ${key}`, error)
    }
  }

  public play(key: SoundType) {
    if (this.isMuted) return

    const audio = this.sounds.get(key)
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {
        // Ignore autoplay errors
      })
    }
  }

  public stopAllSounds() {
    this.sounds.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
  }

  public mute(muted: boolean) {
    this.isMuted = muted
    if (muted) {
      this.stopAllSounds()
    }
  }
}

export const soundManager = SoundManager.getInstance()

export function playSound(type: SoundType) {
  soundManager.play(type)
}

export function stopAllSounds() {
  soundManager.stopAllSounds()
}
