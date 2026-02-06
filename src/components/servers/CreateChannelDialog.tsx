import React, { useState } from 'react';
import { X, Hash } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: nightMode ? '#0a0a0a' : '#fff' }}
      >
        <div className="p-6" style={{ background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Create Channel</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Channel Name
            </label>
            <div className="relative">
              <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${nightMode ? 'text-white/30' : 'text-slate-400'}`} />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="prayer-requests"
                maxLength={30}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border transition-colors ${
                  nightMode
                    ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
                    : 'bg-white border-slate-200 text-black placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Category
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                  nightMode
                    ? 'bg-white/5 border-white/10 text-white'
                    : 'bg-white border-slate-200 text-black'
                }`}
              >
                <option value="">No category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1 ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Topic <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="What's this channel for?"
              maxLength={100}
              className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                nightMode
                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
                  : 'bg-white border-slate-200 text-black placeholder-slate-400'
              }`}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4F96FF 0%, #3b82f6 50%, #2563eb 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
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
