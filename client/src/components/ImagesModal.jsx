import { useState } from 'react';
import { api } from '../api.js';
import { isImageUrl, isPdfUrl } from './ui.jsx';

export default function ImagesModal({ title, urls, onClose }) {
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
            <div className="empty-hint">لا توجد مرفقات</div>
          ) : (
            <div className="img-viewer">
              {isPdfUrl(url) ? (
                <iframe src={url} title="مرفق" />
              ) : isImageUrl(url) ? (
                <img src={url} alt="مرفق" />
              ) : (
                <a href={url} target="_blank" rel="noreferrer">
                  فتح المرفق
                </a>
              )}
              {list.length > 1 ? (
                <div className="img-nav">
                  <button
                    className="btn btn-sm"
                    disabled={index === 0}
                    onClick={() => setIndex(index - 1)}
                  >
                    السابق
                  </button>
                  <span>
                    {index + 1} / {list.length}
                  </span>
                  <button
                    className="btn btn-sm"
                    disabled={index >= list.length - 1}
                    onClick={() => setIndex(index + 1)}
                  >
                    التالي
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
            📄 مرفق
          </span>
        )
      )}
    </div>
  );
}
