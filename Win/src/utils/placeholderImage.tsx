// Placeholder image component for tracks without artwork
export const getPlaceholderSVG = (size: number = 48) => {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#2a2a2a"/>
      <g transform="translate(${size/2}, ${size/2})">
        <circle cx="0" cy="-${size/8}" r="${size/6}" fill="#888" opacity="0.3"/>
        <path d="M 0 ${size/8} L ${size/6} ${size/4} L -${size/6} ${size/4} Z" fill="#888" opacity="0.3"/>
      </g>
    </svg>
  `)}`
}

export const MusicPlaceholderIcon = ({ size = 48, className = '' }: { size?: number, className?: string }) => {
  return (
    <div 
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: '#2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px'
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    </div>
  )
}
