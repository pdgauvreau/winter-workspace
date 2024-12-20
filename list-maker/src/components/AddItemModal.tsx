import { useState } from 'react';
import { ListItem } from '../types';
import './AddItemModal.css';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: Omit<ListItem, 'id'>) => void;
}

export function AddItemModal({ onClose, onAdd }: AddItemModalProps) {
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');
  const [link, setLink] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      text,
      ...(price ? { price: parseFloat(price) } : {}),
      ...(link ? { link } : {}),
      ...(mediaUrl ? { mediaUrl } : {})
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="add-item-form">
          <div className="form-group">
            <label htmlFor="text">Item Text *</label>
            <input
              id="text"
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price (optional)</label>
            <input
              id="price"
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="link">Link (optional)</label>
            <input
              id="link"
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="form-group">
            <label htmlFor="media">Media URL (optional)</label>
            <input
              id="media"
              type="url"
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="add-btn" disabled={!text.trim()}>
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
