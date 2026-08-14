import { useEffect } from 'react'

// "학교 가기" 버튼을 누르는 순간(사용자 제스처) 배경음악을 시작해, 이후 탭을 옮겨도
// 계속 재생되도록 App 최상단에 한 번만 마운트해 두는 숨김 유튜브 플레이어다.
const VIDEO_ID = 'wtlWr8pPErE'
const PLAYER_ELEMENT_ID = 'bgm-yt-player'

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string
          playerVars: Record<string, number | string>
          events: { onReady: () => void }
        },
      ) => { playVideo: () => void }
    }
  }
}

let player: { playVideo: () => void } | null = null
let pendingPlay = false

function ensureApiLoaded(onReady: () => void) {
  if (window.YT?.Player) {
    onReady()
    return
  }
  const prevCallback = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    prevCallback?.()
    onReady()
  }
  if (!document.getElementById('youtube-iframe-api')) {
    const tag = document.createElement('script')
    tag.id = 'youtube-iframe-api'
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }
}

export function startBackgroundMusic() {
  if (player) {
    player.playVideo()
    return
  }
  pendingPlay = true
}

export function BackgroundMusic() {
  useEffect(() => {
    ensureApiLoaded(() => {
      if (player || !window.YT) return
      player = new window.YT.Player(PLAYER_ELEMENT_ID, {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          loop: 1,
          playlist: VIDEO_ID,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (pendingPlay) {
              player?.playVideo()
              pendingPlay = false
            }
          },
        },
      })
    })
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div id={PLAYER_ELEMENT_ID} />
    </div>
  )
}
