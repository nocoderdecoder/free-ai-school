'use client'

import { useId, useState } from 'react'

export function RememberMe({
  emailFormId,
  googleFormId,
}: {
  emailFormId: string
  googleFormId: string
}) {
  const checkboxId = useId()
  const [remember, setRemember] = useState(true)
  const value = remember ? '1' : '0'

  return (
    <div className="ap-auth-options">
      <label htmlFor={checkboxId} className="ap-auth-remember">
        <input
          id={checkboxId}
          type="checkbox"
          checked={remember}
          onChange={event => setRemember(event.currentTarget.checked)}
        />
        <span>Remember me</span>
      </label>
      <input form={googleFormId} type="hidden" name="remember" value={value} />
      <input form={emailFormId} type="hidden" name="remember" value={value} />
    </div>
  )
}
