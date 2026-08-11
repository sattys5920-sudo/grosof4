import { useState } from 'react'
import './SignupScreen.css'
import { useGame } from '../state/GameContext'

const GRADES = ['1학년', '2학년', '3학년']

export function SignupScreen() {
  const { completeSignup } = useGame()
  const [nickname, setNickname] = useState('')
  const [grade, setGrade] = useState(GRADES[0])
  const [photo, setPhoto] = useState<string | null>(null)

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  function submit() {
    if (!nickname.trim()) return
    completeSignup(nickname, grade, photo)
  }

  return (
    <div className="signup">
      <div className="signup__intro">
        <span className="signup__eyebrow">OO고등학교 · 재학생 확인</span>
        <h1>당신은 누구입니까?</h1>
        <p>안개가 걷히기 전, 함께 갇힌 사람들에게 자신을 알려야 한다.</p>
      </div>

      <label className="signup__photo-picker">
        <input type="file" accept="image/*" onChange={onPhotoChange} hidden />
        {photo ? (
          <img className="signup__photo" src={photo} alt="프로필 사진 미리보기" />
        ) : (
          <span className="signup__photo signup__photo--empty">+</span>
        )}
        <span className="signup__photo-label">앨범에서 사진 선택</span>
      </label>

      <label className="signup__field">
        <span>닉네임</span>
        <input
          value={nickname}
          maxLength={12}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="이 안에서 불릴 이름"
        />
      </label>

      <label className="signup__field">
        <span>학년</span>
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>

      <button className="signup__submit" disabled={!nickname.trim()} onClick={submit}>
        입장하기
      </button>
    </div>
  )
}
