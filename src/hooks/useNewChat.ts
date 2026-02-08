import { useState, useEffect, useRef } from 'react';
import { getFriends } from '../lib/database';

interface Connection {
  id: number | string;
  name: string;
  avatar: string;
  status: string;
}

interface UseNewChatOptions {
  userId?: string;
  startChatWith?: { id: string; name: string; avatar?: string } | null;
}

export function useNewChat({ userId, startChatWith }: UseNewChatOptions) {
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedConnections, setSelectedConnections] = useState<Connection[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const recipientInputRef = useRef<HTMLInputElement>(null);

  // Load friends when dialog opens
  useEffect(() => {
    const loadFriends = async () => {
      if (!showNewChatDialog || !userId) return;
      setLoadingConnections(true);
      try {
        const friends = await getFriends(userId);
        const mapped: Connection[] = friends.map((f: any) => ({
          id: f.id,
          name: f.display_name || f.username || 'User',
          avatar: f.avatar_emoji || '👤',
          status: f.is_online ? 'online' : 'offline',
        }));
        setConnections(mapped);
      } catch (err) {
        console.error('Error loading friends for chat:', err);
        setConnections([]);
      }
      setLoadingConnections(false);
    };
    loadFriends();
  }, [showNewChatDialog, userId]);

  // Auto-focus recipient input
  useEffect(() => {
    if (showNewChatDialog && recipientInputRef.current) {
      recipientInputRef.current.focus();
    }
  }, [showNewChatDialog]);

  // Pre-fill from startChatWith prop
  useEffect(() => {
    if (startChatWith?.id && startChatWith?.name) {
      setSelectedConnections([{
        id: startChatWith.id,
        name: startChatWith.name,
        avatar: startChatWith.avatar || '👤',
        status: 'online',
      }]);
      setShowNewChatDialog(true);
      setShowSuggestions(false);
    }
  }, [startChatWith]);

  // Reset state when dialog closes
  const closeDialog = () => {
    setShowNewChatDialog(false);
    setSearchQuery('');
    setNewChatMessage('');
    setSelectedConnections([]);
    setShowSuggestions(false);
  };

  return {
    showNewChatDialog, setShowNewChatDialog,
    searchQuery, setSearchQuery,
    newChatMessage, setNewChatMessage,
    showSuggestions, setShowSuggestions,
    selectedConnections, setSelectedConnections,
    connections, loadingConnections,
    recipientInputRef,
    closeDialog,
  };
}

export type { Connection };
