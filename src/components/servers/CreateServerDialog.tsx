import React, { useState } from 'react';
import { X } from 'lucide-react';
import { validateGroup, sanitizeInput } from '../../lib/inputValidation';
import { showError } from '../../lib/toast';

interface CreateServerDialogProps {
  nightMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, iconEmoji: string) => void;
}

const SERVER_EMOJIS = ['⛪', '✝️', '🕊️', '🙏', '⭐', '🔥', '💒', '📖', '🌟', '💜', '🏠', '🎵'];

const CreateServerDialog: React.FC<CreateServerDialogProps> = ({ nightMode, isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconEmoji, setIconEmoji] = useState('⛪');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const sanitizedName = sanitizeInput(name.trim());
    if (!sanitizedName) {
      showError('Please enter a server name');
      return;
    }
    const validation = validateGroup({ name: sanitizedName, description });
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      showError(firstError || 'Invalid server name');
      return;
    }
    setLoading(true);
    await onCreate(sanitizedName, description.trim(), iconEmoji);
    setLoading(false);
    setName('');
    setDescription('');
    setIconEmoji('⛪');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: nightMode ? '#0a0a0a' : '#fff' }}
      >
        {/* Header */}
        <div className="p-6" style={{ background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Create Server</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <p className="text-white/70 text-sm mt-1">Create a new server for your church or community</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Icon picker */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Server Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {SERVER_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setIconEmoji(emoji)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                    iconEmoji === emoji
                      ? 'ring-2 ring-blue-500 scale-110'
                      : nightMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                  }`}
                  style={{
                    background: iconEmoji === emoji
                      ? nightMode ? 'rgba(79, 150, 255, 0.2)' : 'rgba(79, 150, 255, 0.1)'
                      : 'transparent'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Server name */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Church Community"
              maxLength={50}
              className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                nightMode
                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
                  : 'bg-white border-slate-200 text-black placeholder-slate-400'
              }`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's your server about?"
              rows={3}
              maxLength={200}
              className={`w-full px-4 py-2.5 rounded-xl border resize-none transition-colors ${
                nightMode
                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
                  : 'bg-white border-slate-200 text-black placeholder-slate-400'
              }`}
            />
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            {loading ? 'Creating...' : 'Create Server'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateServerDialog;
