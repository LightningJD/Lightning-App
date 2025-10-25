import React, { useState } from 'react';

const MenuItem = ({ icon: Icon, label, subtext, toggle, defaultOn, danger, nightMode, comingSoon, disabled, onClick }) => {
  const [isOn, setIsOn] = useState(defaultOn || false);

  const handleClick = () => {
    if (!disabled && !comingSoon && onClick) {
      onClick();
    }
  };

  return (
    <button
      className={`w-full px-4 py-3 flex items-center justify-between transition-colors border-b last:border-b-0 ${
        disabled || comingSoon
          ? nightMode ? 'cursor-not-allowed opacity-50' : 'cursor-not-allowed opacity-60'
          : nightMode
          ? 'hover:bg-white/5 border-white/10'
          : 'hover:bg-slate-50 border-slate-100'
      }`}
      disabled={disabled || comingSoon}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : nightMode ? 'text-slate-100' : 'text-slate-400'}`} />
        <div className="text-left">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium ${danger ? 'text-red-600' : nightMode ? 'text-slate-100' : 'text-slate-900'}`}>{label}</p>
            {comingSoon && (
              <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${nightMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                SOON
              </span>
            )}
          </div>
          {subtext && <p className={`text-xs mt-0.5 ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>{subtext}</p>}
        </div>
      </div>
      {toggle && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOn(!isOn);
          }}
          className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${isOn ? 'bg-blue-600' : nightMode ? 'bg-white/10' : 'bg-slate-300'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full m-0.5 transition-transform shadow-sm ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      )}
      {!toggle && !subtext && (
        <svg className={`w-4 h-4 flex-shrink-0 ${nightMode ? 'text-slate-100' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
};

export default MenuItem;
