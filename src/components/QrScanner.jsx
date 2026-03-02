import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QrScanner({ onDetected, onClose }) {
  const containerId = 'lbs-qr-scanner'
  const scannerRef = useRef(null)
  const scannedRef = useRef(false)

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          if (scannedRef.current) return
          scannedRef.current = true
          await scanner.stop()
          onDetected(decodedText)
        },
        () => {},
      )
      .catch(() => {
        onClose()
      })

    return () => {
      scannedRef.current = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
      scannerRef.current?.clear().catch(() => {})
    }
  }, [onDetected, onClose])

  return (
    <div className="space-y-3">
      <div id={containerId} className="w-full min-h-[300px] rounded-xl overflow-hidden bg-black" />
      <button
        onClick={onClose}
        className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm"
      >
        Fermer le scanner
      </button>
    </div>
  )
}
