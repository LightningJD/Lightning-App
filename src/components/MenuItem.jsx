import React, { useState } from 'react';

const MenuItem = ({ icon: Icon, label, subtext, toggle, defaultOn, danger }) => {
  const [isOn, setIsOn] = useState(defaultOn || false);

  return (
    <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-slate-400'}`} />
        <div className="text-left">
          <p className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-slate-900'}`}>{label}</p>
          {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
        </div>
      </div>
      {toggle && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOn(!isOn);
          }}
          className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${isOn ? 'bg-blue-500' : 'bg-slate-300'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full m-0.5 transition-transform shadow-sm ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      )}
      {!toggle && !subtext && (
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
};

export default MenuItem;
