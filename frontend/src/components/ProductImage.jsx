import React, { useState, useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';

/** Normalize Google Drive links so they work in <img> tags. */
export function resolveImageSrc(src) {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:image')) return trimmed;

  const byQuery = trimmed.match(/[?&]id=([^&]+)/);
  if (trimmed.includes('drive.google.com') && byQuery) {
    return `https://drive.google.com/thumbnail?id=${byQuery[1]}&sz=w400`;
  }

  const byPath = trimmed.match(/\/d\/([^/]+)/);
  if (trimmed.includes('drive.google.com') && byPath) {
    return `https://drive.google.com/thumbnail?id=${byPath[1]}&sz=w400`;
  }

  if (trimmed.includes('drive.google.com/uc')) {
    return trimmed.replace('/uc?', '/thumbnail?').replace('uc?id=', 'thumbnail?id=') + '&sz=w400';
  }

  return trimmed;
}

export default function ProductImage({ src, alt = 'Product', height = 140, style = {} }) {
  const [failed, setFailed] = useState(false);
  const resolved = useMemo(() => resolveImageSrc(src), [src]);

  if (!resolved || failed) {
    return (
      <div
        style={{
          height,
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <ImageIcon size={32} className="text-secondary" style={{ opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{
        height,
        width: '100%',
        objectFit: 'cover',
        display: 'block',
        ...style,
      }}
    />
  );
}
