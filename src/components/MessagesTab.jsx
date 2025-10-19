import React, { useState } from 'react';

const MessagesTab = () => {
  const [activeChat, setActiveChat] = useState(null);

  const conversations = [
    { id: 1, name: "Sarah Mitchell", avatar: "👤", online: true, lastMessage: "That's amazing!", timestamp: "2m ago" },
    { id: 2, name: "John Rivers", avatar: "🧑", online: false, lastMessage: "See you Sunday!", timestamp: "1h ago" },
  ];

  if (activeChat) {
    return (
      <div className="py-4 flex flex-col h-[calc(100vh-180px)]">
        <button onClick={() => setActiveChat(null)} className="text-blue-600 mb-4 text-sm font-semibold px-4">← Back</button>
        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-4 mb-4 space-y-3 overflow-y-auto mx-4">
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-900 px-4 py-2 rounded-lg max-w-xs">
              <p className="text-sm">Hey! I loved your story</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-xs">
              <p className="text-sm">Thank you so much!</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-4">
          <input type="text" placeholder="Type a message..." className="flex-1 px-4 py-2 border border-slate-200 rounded-lg" />
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">Send</button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-3 px-4">
      {conversations.map((chat) => (
        <button key={chat.id} onClick={() => setActiveChat(chat.id)} className="w-full bg-white rounded-lg border border-slate-200 p-4 text-left hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="text-2xl">{chat.avatar}</div>
              {chat.online && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{chat.name}</h3>
              <p className="text-sm text-slate-600">{chat.lastMessage}</p>
            </div>
            <span className="text-xs text-slate-500">{chat.timestamp}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default MessagesTab;
