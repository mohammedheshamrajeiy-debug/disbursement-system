import { useState } from 'react';
import { api } from '../api.js';
import { useTranslation } from 'react-i18next';
import { isImageUrl, isPdfUrl } from './ui.jsx';

export default function ImagesModal({ title, urls, onClose }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const list = urls || [];
  const url = list[index];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {title} ({list.length})
          </h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {!url ? (
            <div className="empty-hint">{t('common.noAttachments')}</div>
          ) : (
            <div className="img-viewer">
              {isPdfUrl(url) ? (
                <iframe src={url} title={t('common.attachment')} />
              ) : isImageUrl(url) ? (
                <img src={url} alt={t('common.attachment')} />
              ) : (
                <a href={url} target="_blank" rel="noreferrer">
                  {t('common.openAttachment')}
                </a>
              )}
              {list.length > 1 ? (
                <div className="img-nav">
                  <button
                    className="btn btn-sm"
                    disabled={index === 0}
                    onClick={() => setIndex(index - 1)}
                  >
                    {t('common.previous')}
                  </button>
                  <span>
                    {index + 1} / {list.length}
                  </span>
                  <button
                    className="btn btn-sm"
                    disabled={index >= list.length - 1}
                    onClick={() => setIndex(index + 1)}
                  >
                    {t('common.next')}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export async function fetchImages(urls) {
  return urls;
}

export function ImageThumbs({ urls, onView }) {
  const { t } = useTranslation();
  if (!urls || !urls.length) return <span className="muted">—</span>;
  return (
    <div className="img-thumbs">
      {urls.map((u, i) =>
        isImageUrl(u) ? (
          <img
            key={i}
            src={u}
            className="img-thumb"
            onClick={() => onView && onView(i)}
            alt=""
          />
        ) : (
          <span key={i} className="img-chip" onClick={() => onView && onView(i)}>
            📄 {t('common.attachment')}
          </span>
        )
      )}
    </div>
  );
}
