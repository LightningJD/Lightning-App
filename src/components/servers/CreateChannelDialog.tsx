import React, { useState } from 'react';
import { X } from 'lucide-react';
import { sanitizeInput } from '../../lib/inputValidation';
import { showError } from '../../lib/toast';

interface CreateChannelDialogProps {
  nightMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, topic: string, categoryId?: string, emojiIcon?: string, slowmodeSeconds?: number) => void;
  categories: Array<{ id: string; name: string }>;
  defaultCategoryId?: string;
}

const CreateChannelDialog: React.FC<CreateChannelDialogProps> = ({
  nightMode, isOpen, onClose, onCreate, categories, defaultCategoryId
}) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [emojiIcon, setEmojiIcon] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [slowmode, setSlowmode] = useState(0);
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
    await onCreate(sanitizedName, topic.trim(), categoryId || undefined, emojiIcon || undefined, slowmode || undefined);
    setLoading(false);
    setName('');
    setTopic('');
    setEmojiIcon('');
    setSlowmode(0);
    setShowEmojiPicker(false);
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
          {/* Channel name with emoji picker */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${nightMode ? 'text-white/70' : 'text-black/70'}`}>
              Channel Name
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all hover:scale-105 active:scale-95 ${
                  nightMode ? 'hover:bg-white/15' : 'hover:bg-white/80'
                }`}
                style={{
                  background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                }}
                title="Choose emoji"
              >
                {emojiIcon || '\u{1F4AC}'}
              </button>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="prayer-requests"
                maxLength={30}
                className={`flex-1 px-4 py-3 rounded-xl text-sm transition-all ${
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
            {showEmojiPicker && (
              <div
                className={`mt-2 p-2 rounded-xl border ${nightMode ? 'border-white/10' : 'border-black/05'}`}
                style={{
                  background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
                }}
              >
                <div className="grid grid-cols-8 gap-1">
                  {['\u{1F4AC}', '\u{1F64F}', '\u{1F4D6}', '\u{1F3B5}', '\u{1F4E2}', '\u{1F44B}', '\u{1F4C5}', '\u{1F91D}',
                    '\u{2728}', '\u{1F389}', '\u{1F4F7}', '\u{1F517}', '\u{1F3A4}', '\u{1F31F}', '\u{1F54A}\u{FE0F}', '\u{26EA}',
                    '\u{2764}\u{FE0F}', '\u{1F525}', '\u{271D}\u{FE0F}', '\u{1F451}', '\u{1F6E1}\u{FE0F}', '\u{1F3AE}', '\u{1F4BB}', '\u{1F4DA}',
                    '\u{1F3A8}', '\u{1F30D}', '\u{1F680}', '\u{1F4A1}', '\u{1F3C6}', '\u{1F381}', '\u{1F4DD}', '\u{1F512}'
                  ].map(emoji => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => { setEmojiIcon(emoji); setShowEmojiPicker(false); }}
                      className={`text-lg p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${
                        emojiIcon === emoji
                          ? 'bg-blue-500/20 ring-1 ring-blue-500'
                          : nightMode ? 'hover:bg-white/10' : 'hover:bg-black/5'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {emojiIcon && (
                  <button
                    type="button"
                    onClick={() => { setEmojiIcon(''); setShowEmojiPicker(false); }}
                    className={`mt-2 w-full text-xs py-1.5 rounded-lg transition-all ${
                      nightMode ? 'text-white/40 hover:bg-white/5' : 'text-black/40 hover:bg-black/5'
                    }`}
                  >
                    Reset to default
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Category - hidden when created from within a specific category */}
          {categories.length > 0 && !defaultCategoryId && (
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

          {/* Slowmode */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${nightMode ? 'text-white/70' : 'text-black/70'}`}>
              Slowmode <span className={`font-normal ${nightMode ? 'text-white/30' : 'text-black/30'}`}>(optional)</span>
            </label>
            <select
              value={slowmode}
              onChange={e => setSlowmode(Number(e.target.value))}
              className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                nightMode ? 'text-white' : 'text-black'
              }`}
              style={{
                background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <option value={0}>Off</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
            </select>
            <p className={`text-xs mt-1.5 ${nightMode ? 'text-white/30' : 'text-black/30'}`}>
              Limits how often members can send messages
            </p>
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
