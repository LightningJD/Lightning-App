import React, { useState } from 'react';
import { X } from 'lucide-react';
import { sanitizeInput } from '../../lib/inputValidation';
import { showError } from '../../lib/toast';

interface CreateChannelDialogProps {
  nightMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, topic: string, categoryId?: string) => void;
  categories: Array<{ id: string; name: string }>;
  defaultCategoryId?: string;
}

const CreateChannelDialog: React.FC<CreateChannelDialogProps> = ({
  nightMode, isOpen, onClose, onCreate, categories, defaultCategoryId
}) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const sanitizedName = sanitizeInput(name.trim()).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!sanitizedName) {
      showError('Please enter a channel name');
      return;
    }
    if (sanitizedName.length < 2) {
      showError('Channel name must be at least 2 characters');
      return;
    }
    setLoading(true);
    await onCreate(sanitizedName, topic.trim(), categoryId || undefined);
    setLoading(false);
    setName('');
    setTopic('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: nightMode ? 'rgba(15, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: nightMode
            ? '0 24px 48px rgba(0,0,0,0.4)'
            : '0 24px 48px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="p-6 pb-5"
          style={{ background: 'linear-gradient(135deg, rgba(79, 150, 255, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{'\u{1F4AC}'}</span>
              <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-black'}`}>Create Channel</h2>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                nightMode ? 'hover:bg-white/10 text-white/50' : 'hover:bg-black/5 text-black/50'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Channel name */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${nightMode ? 'text-white/70' : 'text-black/70'}`}>
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="prayer-requests"
              maxLength={30}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                nightMode
                  ? 'text-white placeholder-white/30'
                  : 'text-black placeholder-black/40'
              }`}
              style={{
                background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              }}
            />
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className={`block text-sm font-semibold mb-2 ${nightMode ? 'text-white/70' : 'text-black/70'}`}>
                Category
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                  nightMode ? 'text-white' : 'text-black'
                }`}
                style={{
                  background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                <option value="">No category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Topic */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${nightMode ? 'text-white/70' : 'text-black/70'}`}>
              Topic <span className={`font-normal ${nightMode ? 'text-white/30' : 'text-black/30'}`}>(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="What's this channel for?"
              maxLength={100}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                nightMode
                  ? 'text-white placeholder-white/30'
                  : 'text-black placeholder-black/40'
              }`}
              style={{
                background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              }}
            />
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-3.5 rounded-xl text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
              boxShadow: name.trim() ? '0 4px 16px rgba(59, 130, 246, 0.35)' : 'none',
            }}
          >
            {loading ? 'Creating...' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChannelDialog;
