import { useState, useEffect, useRef } from 'react'

const DEFAULT_MINUTES = { focus: 25, shortBreak: 5, longBreak: 15 }
const MODE_LABELS = { focus: '집중', shortBreak: '짧은 휴식', longBreak: '긴 휴식' }

const LOFI_STREAMS = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl · beats to relax/study' },
  { id: '4xDzrJKXOOY', name: 'Lofi Girl · synthwave radio' },
  { id: 'S_MOd40zlYU', name: 'Chillhop · jazzy lofi' },
]

const loadJSON = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [dark, setDark] = useState(() => loadJSON('pomo_dark', true))
  const [minutes, setMinutes] = useState(() => loadJSON('pomo_minutes', DEFAULT_MINUTES))
  const [voiceOn, setVoiceOn] = useState(() => loadJSON('pomo_voice', true))
  const [mode, setMode] = useState('focus')
  const [secondsLeft, setSecondsLeft] = useState(minutes.focus * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedCycles, setCompletedCycles] = useState(
    () => Number(localStorage.getItem('pomo_cycles') || 0)
  )
  const [streamIdx, setStreamIdx] = useState(0)
  const [musicOn, setMusicOn] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const intervalRef = useRef(null)
  const femaleVoiceRef = useRef(null)

  // 여성 한국어 음성 자동 선택
  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const koFemale = voices.find(
        (v) =>
          v.lang.startsWith('ko') &&
          /female|여자|heami|sunhi|yuna/i.test(v.name)
      )
      const koAny = voices.find((v) => v.lang.startsWith('ko'))
      femaleVoiceRef.current = koFemale || koAny || null
    }
    pickVoice()
    window.speechSynthesis.onvoiceschanged = pickVoice
  }, [])

  // 음성 재생 함수 (cancel 제거 → 지연 방지)
  const speak = (text) => {
    if (!voiceOn || !('speechSynthesis' in window)) return
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ko-KR'
    utter.rate = 1.0
    utter.pitch = 1.2
    if (femaleVoiceRef.current) utter.voice = femaleVoiceRef.current
    window.speechSynthesis.speak(utter)
  }

  useEffect(() => {
    localStorage.setItem('pomo_dark', JSON.stringify(dark))
  }, [dark])

  useEffect(() => {
    localStorage.setItem('pomo_minutes', JSON.stringify(minutes))
  }, [minutes])

  useEffect(() => {
    localStorage.setItem('pomo_voice', JSON.stringify(voiceOn))
  }, [voiceOn])

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 1
        // 화면에 표시될 값 기준으로 카운트다운 (5,4,3,2,1)
        const countdownMap = { 5: '오', 4: '사', 3: '삼', 2: '이', 1: '일' }
        if (countdownMap[next]) speak(countdownMap[next])

        if (s <= 1) {
          clearInterval(intervalRef.current)
          setTimeout(() => {
            speak(mode === 'focus' ? '휴식 시간입니다' : '다시 집중해볼까요')
          }, 700)
          handleComplete()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isRunning])

  const handleComplete = () => {
    setIsRunning(false)
    if (mode === 'focus') {
      const next = completedCycles + 1
      setCompletedCycles(next)
      localStorage.setItem('pomo_cycles', next)
      switchMode(next % 4 === 0 ? 'longBreak' : 'shortBreak')
    } else {
      switchMode('focus')
    }
    if (Notification.permission === 'granted') {
      new Notification('타이머 완료', {
        body: mode === 'focus' ? '휴식 시간이에요' : '다시 집중해볼까요',
      })
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setSecondsLeft(minutes[newMode] * 60)
    setIsRunning(false)
  }

  const toggleTimer = () => {
    if (!isRunning && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    // 첫 클릭 시 음성 엔진 워밍업
    if (!isRunning && voiceOn && 'speechSynthesis' in window) {
      const warm = new SpeechSynthesisUtterance(' ')
      warm.volume = 0
      window.speechSynthesis.speak(warm)
    }
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setSecondsLeft(minutes[mode] * 60)
  }

  const resetCycles = () => {
    setCompletedCycles(0)
    localStorage.setItem('pomo_cycles', 0)
  }

  const updateMinutes = (key, val) => {
    const num = Math.max(1, Math.min(180, Number(val) || 1))
    const next = Object.assign({}, minutes)
    next[key] = num
    setMinutes(next)
    if (key === mode && !isRunning) setSecondsLeft(num * 60)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = 1 - secondsLeft / (minutes[mode] * 60)

  const bg = dark ? 'bg-neutral-950' : 'bg-neutral-50'
  const text = dark ? 'text-neutral-100' : 'text-neutral-900'
  const subtext = dark ? 'text-neutral-400' : 'text-neutral-500'
  const card = dark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-neutral-200'
  const cardInner = dark ? 'bg-neutral-800' : 'bg-neutral-100'
  const primary = dark ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'
  const ring = dark ? 'stroke-neutral-100' : 'stroke-neutral-900'
  const ringBg = dark ? 'stroke-neutral-800' : 'stroke-neutral-200'

  return (
    <div
      className={`min-h-screen ${bg} ${text} transition-colors duration-300`}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      }}
    >
      <div className="max-w-md mx-auto px-6 py-8 flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pomodoro</h1>
            <p className={`text-xs ${subtext} mt-0.5`}>Focus with lo-fi</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${cardInner} hover:opacity-80 transition`}
              aria-label="설정"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              onClick={() => setVoiceOn(!voiceOn)}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${cardInner} hover:opacity-80 transition`}
              aria-label="음성"
            >
              {voiceOn ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setDark(!dark)}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${cardInner} hover:opacity-80 transition`}
              aria-label="테마"
            >
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <div className={`flex gap-1 ${cardInner} p-1 rounded-2xl`}>
          {Object.keys(MODE_LABELS).map((key) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition ${
                mode === key
                  ? dark
                    ? 'bg-neutral-950 text-white shadow-sm'
                    : 'bg-white text-neutral-900 shadow-sm'
                  : subtext
              }`}
            >
              {MODE_LABELS[key]}
            </button>
          ))}
        </div>

        <div className={`relative aspect-square ${card} border rounded-3xl p-6 flex items-center justify-center`}>
          <svg className="absolute inset-6 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" className={ringBg} strokeWidth="2.5" />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              className={ring}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}`}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="text-center z-10">
            <div className="text-6xl font-semibold tabular-nums tracking-tight">
              {mm}:{ss}
            </div>
            <div className={`text-xs ${subtext} mt-2 uppercase tracking-widest`}>
              {MODE_LABELS[mode]}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleTimer}
            className={`flex-1 ${primary} font-semibold py-4 rounded-2xl text-base transition active:scale-95`}
          >
            {isRunning ? '일시정지' : '시작'}
          </button>
          <button
            onClick={resetTimer}
            className={`${cardInner} font-medium py-4 px-5 rounded-2xl transition active:scale-95`}
            aria-label="리셋"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <polyline points="3 4 3 10 9 10" />
            </svg>
          </button>
        </div>

        {settingsOpen && (
          <div className={`${card} border rounded-2xl p-5`}>
            <div className="text-sm font-semibold mb-3">타이머 설정 (분)</div>
            <div className="flex flex-col gap-3">
              {Object.keys(MODE_LABELS).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <label className={`text-sm ${subtext}`}>{MODE_LABELS[key]}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateMinutes(key, minutes[key] - 1)}
                      className={`w-8 h-8 rounded-full ${cardInner} flex items-center justify-center font-medium`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={minutes[key]}
                      onChange={(e) => updateMinutes(key, e.target.value)}
                      className={`w-14 text-center py-1.5 rounded-lg ${cardInner} outline-none text-sm font-medium`}
                      min="1"
                      max="180"
                    />
                    <button
                      onClick={() => updateMinutes(key, minutes[key] + 1)}
                      className={`w-8 h-8 rounded-full ${cardInner} flex items-center justify-center font-medium`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => speak('안녕하세요, 음성 테스트입니다')}
                className={`mt-2 text-xs ${cardInner} py-2 rounded-lg hover:opacity-80`}
              >
                🔊 음성 테스트
              </button>
            </div>
          </div>
        )}

        <div className={`${card} border rounded-2xl p-4 flex items-center justify-between`}>
          <div>
            <div className={`text-xs ${subtext}`}>오늘 완료</div>
            <div className="text-lg font-semibold mt-0.5 tabular-nums">
              {completedCycles}{' '}
              <span className={`text-xs font-normal ${subtext}`}>사이클</span>
            </div>
          </div>
          <button
            onClick={resetCycles}
            className={`text-xs ${subtext} hover:opacity-70 px-3 py-1.5 rounded-lg ${cardInner}`}
          >
            초기화
          </button>
        </div>

        <div className={`${card} border rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Lo-fi Radio</div>
            <button
              onClick={() => setMusicOn(!musicOn)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                musicOn ? primary : cardInner
              }`}
            >
              {musicOn ? '켜짐' : '꺼짐'}
            </button>
          </div>

          <select
            value={streamIdx}
            onChange={(e) => setStreamIdx(Number(e.target.value))}
            className={`w-full ${cardInner} ${text} text-sm rounded-xl px-3 py-2.5 outline-none border-none`}
          >
            {LOFI_STREAMS.map((s, i) => (
              <option key={s.id} value={i}>
                {s.name}
              </option>
            ))}
          </select>

          {musicOn && (
            <div className="aspect-video rounded-xl overflow-hidden mt-3">
              <iframe
                key={LOFI_STREAMS[streamIdx].id}
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${LOFI_STREAMS[streamIdx].id}?autoplay=1`}
                title="Lo-f </div>
    </div>
  )
}