import React, { useState } from 'react';
import { X, HelpCircle, Search, ChevronRight, ChevronDown, MessageCircle, Shield, Users, MapPin, Heart, Bell, Zap, Mail } from 'lucide-react';

const HelpCenter = ({ isOpen, onClose, nightMode, onContactSupport }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqCategories = [
    {
      title: 'Getting Started',
      icon: Zap,
      faqs: [
        {
          question: 'How do I create my testimony?',
          answer: 'Go to your Profile tab and tap "Add Testimony". You can either write your own testimony or use our AI assistant to help you articulate your faith journey. The AI will ask you questions about your faith experience and help create a meaningful testimony.'
        },
        {
          question: 'What is Lightning?',
          answer: 'Lightning is a faith-based social networking app designed to connect Christians through authentic testimonies and location-based features. Share your faith journey, connect with believers nearby, join groups, and build meaningful relationships.'
        },
        {
          question: 'Is Lightning free to use?',
          answer: 'Yes, Lightning is completely free to use. All core features including messaging, groups, testimonies, and connections are available at no cost.'
        }
      ]
    },
    {
      title: 'Privacy & Safety',
      icon: Shield,
      faqs: [
        {
          question: 'How do I make my profile private?',
          answer: 'Go to Settings > Privacy & Safety > Make Profile Private. When enabled, only your friends can see your full profile and testimony. You won\'t appear in the Connect tab to users who aren\'t your friends.'
        },
        {
          question: 'Who can see my testimony?',
          answer: 'You can control testimony visibility in Settings > Privacy & Safety > Who Can See Testimony. Options include: Everyone (all app users), Friends Only (only accepted connections), or Just Me (private).'
        },
        {
          question: 'How do I block someone?',
          answer: 'Go to the user\'s profile and tap the three dots menu, then select "Block User". Blocked users cannot message you, see your profile, or interact with your content.'
        },
        {
          question: 'Is my location data safe?',
          answer: 'Your exact location is never shared with other users. We only show approximate distance (e.g., "2 miles away") to help you connect with nearby Christians. You can disable location features in Settings.'
        }
      ]
    },
    {
      title: 'Connections & Friends',
      icon: Users,
      faqs: [
        {
          question: 'How do I connect with someone?',
          answer: 'Go to the Connect tab to find Christians near you. Tap on someone\'s profile and select "Send Friend Request". Once they accept, you\'ll be connected and can message each other.'
        },
        {
          question: 'What\'s the difference between followers and friends?',
          answer: 'Lightning uses a mutual friend system. Both users must accept the connection to become friends. There are no one-way followers - connections are always mutual.'
        },
        {
          question: 'How do I find Christians near me?',
          answer: 'The Connect tab automatically shows Christians in your area (within 25 miles by default). Make sure location services are enabled for the app to see nearby users.'
        }
      ]
    },
    {
      title: 'Messages & Groups',
      icon: MessageCircle,
      faqs: [
        {
          question: 'How do I send a message?',
          answer: 'Go to the Messages tab and tap the + button to start a new conversation. Select a friend from your connections list and type your message. You can only message users you\'re connected with.'
        },
        {
          question: 'How do I create a group?',
          answer: 'Go to the Groups tab and tap "Create Group". Give your group a name and description, then invite friends to join. Groups can be public (anyone can join) or private (invite-only).'
        },
        {
          question: 'Can I delete messages?',
          answer: 'Currently, messages cannot be deleted once sent. Be mindful of what you share. We\'re working on adding message deletion in a future update.'
        },
        {
          question: 'What are group co-leaders?',
          answer: 'Group creators can promote members to co-leaders. Co-leaders can help manage the group, approve join requests, and moderate content.'
        }
      ]
    },
    {
      title: 'Testimonies',
      icon: Heart,
      faqs: [
        {
          question: 'What should I include in my testimony?',
          answer: 'Share your personal faith journey - how you came to faith, significant moments with God, challenges you\'ve overcome, and how faith impacts your daily life. Be authentic and honest.'
        },
        {
          question: 'Can I edit my testimony?',
          answer: 'Yes! Go to your Profile tab and tap the edit button on your testimony. You can update it anytime as your faith journey continues to evolve.'
        },
        {
          question: 'What is AI testimony generation?',
          answer: 'Our AI assistant helps you articulate your faith story by asking thoughtful questions about your journey. It then helps create a well-written testimony that you can edit and personalize.'
        },
        {
          question: 'Can others comment on my testimony?',
          answer: 'Yes, other users can like and comment on your testimony to offer encouragement and share how your story impacted them.'
        }
      ]
    },
    {
      title: 'Account & Settings',
      icon: Bell,
      faqs: [
        {
          question: 'How do I change my profile picture?',
          answer: 'Go to Settings > Edit Profile or tap the camera icon on your profile. You can upload a photo or choose an emoji avatar.'
        },
        {
          question: 'How do I delete my account?',
          answer: 'Go to Settings > Account > Delete Account. This will permanently delete your profile, messages, and all data. This action cannot be undone.'
        },
        {
          question: 'How do I change notification settings?',
          answer: 'Go to Settings > Notifications to control which notifications you receive for messages, friend requests, and group activity.'
        },
        {
          question: 'Can I use Lightning on multiple devices?',
          answer: 'Yes! Your account syncs across all devices. Just sign in with the same account on each device.'
        }
      ]
    }
  ];

  const filteredFAQs = searchQuery
    ? faqCategories.map(category => ({
        ...category,
        faqs: category.faqs.filter(
          faq =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.faqs.length > 0)
    : faqCategories;

  const toggleFAQ = (categoryIndex, faqIndex) => {
    const key = `${categoryIndex}-${faqIndex}`;
    setExpandedFAQ(expandedFAQ === key ? null : key);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-3xl rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col ${
            nightMode ? 'bg-[#0a0a0a]' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-6"
            style={{
              background: nightMode
                ? 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)'
                : 'linear-gradient(135deg, rgba(219, 234, 254, 0.8) 0%, rgba(191, 219, 254, 0.8) 100%)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className={`w-6 h-6 ${nightMode ? 'text-white' : 'text-blue-600'}`} />
                <div>
                  <h2 className={`text-xl font-bold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                    Help Center
                  </h2>
                  <p className={`text-sm ${nightMode ? 'text-white/90' : 'text-slate-600'}`}>
                    Find answers to common questions
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  nightMode
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className={`p-4 border-b ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                nightMode ? 'text-slate-400' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg transition-colors ${
                  nightMode
                    ? 'bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:bg-white/10'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>

          {/* FAQ Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-8">
                <HelpCircle className={`w-12 h-12 mx-auto mb-3 ${
                  nightMode ? 'text-slate-600' : 'text-gray-300'
                }`} />
                <p className={`${nightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  No results found for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredFAQs.map((category, categoryIndex) => {
                  const Icon = category.icon;
                  return (
                    <div
                      key={categoryIndex}
                      className={`rounded-xl border ${
                        nightMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className={`px-4 py-3 border-b ${
                        nightMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          <h3 className={`font-semibold ${nightMode ? 'text-white' : 'text-slate-900'}`}>
                            {category.title}
                          </h3>
                        </div>
                      </div>
                      <div>
                        {category.faqs.map((faq, faqIndex) => {
                          const isExpanded = expandedFAQ === `${categoryIndex}-${faqIndex}`;
                          return (
                            <div
                              key={faqIndex}
                              className={`border-b last:border-b-0 ${
                                nightMode ? 'border-white/5' : 'border-gray-100'
                              }`}
                            >
                              <button
                                onClick={() => toggleFAQ(categoryIndex, faqIndex)}
                                className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors ${
                                  nightMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                                }`}
                              >
                                <span className={`font-medium ${
                                  nightMode ? 'text-slate-100' : 'text-slate-900'
                                }`}>
                                  {faq.question}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className={`w-4 h-4 flex-shrink-0 ${
                                    nightMode ? 'text-slate-400' : 'text-gray-400'
                                  }`} />
                                ) : (
                                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                                    nightMode ? 'text-slate-400' : 'text-gray-400'
                                  }`} />
                                )}
                              </button>
                              {isExpanded && (
                                <div className={`px-4 pb-3 ${nightMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                  <p className="leading-relaxed">
                                    {faq.answer}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Contact Support */}
          <div className={`p-6 border-t ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <p className={`text-sm ${nightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Can't find what you're looking for?
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onContactSupport) onContactSupport();
                }}
                className={`px-6 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                  nightMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpCenter;