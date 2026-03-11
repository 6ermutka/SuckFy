import React, { useState, useEffect } from 'react'
import '../styles/TitleBar.css'

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const checkMaximized = async () => {
      if ((window as any).electron?.window?.isMaximized) {
        const maximized = await (window as any).electron.window.isMaximized()
        setIsMaximized(maximized)
      }
    }
    checkMaximized()
  }, [])

  const handleMinimize = () => {
    if ((window as any).electron?.window?.minimize) {
      (window as any).electron.window.minimize()
    }
  }

  const handleMaximize = async () => {
    if ((window as any).electron?.window?.maximize) {
      await (window as any).electron.window.maximize()
      const maximized = await (window as any).electron.window.isMaximized()
      setIsMaximized(maximized)
    }
  }

  const handleClose = () => {
    if ((window as any).electron?.window?.close) {
      (window as any).electron.window.close()
    }
  }

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">
        <div className="titlebar-title">SuckFy</div>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-button minimize" onClick={handleMinimize} title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="0" y="5" width="12" height="2" fill="currentColor"/>
          </svg>
        </button>
        <button className="titlebar-button maximize" onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="0" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="0" y="2" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )}
        </button>
        <button className="titlebar-button close" onClick={handleClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M0 0 L12 12 M12 0 L0 12" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TitleBar
