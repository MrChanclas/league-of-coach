import { useEffect, useState } from 'react'
import { STATUS_MESSAGE_TIMEOUT_MS } from '../constants'

/** A transient status line that clears itself a few seconds after it's set. */
export function useStatusMessage() {
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), STATUS_MESSAGE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [status])

  return [status, setStatus] as const
}
