import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Send, Loader, TrendingUp, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://d4y2c4layjh2.cloudfront.net';

const AIBusinessConsultant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    "How many tickets should I generate for this Saturday?",
    "What's the optimal price for my next event?",
    "When should I launch ticket sales?",
    "How can I increase my sellout rate?",
    "What are the best days for my business?"
  ];

  const sendMessage = async (question) => {
    if (!question.trim() && !inputMessage.trim()) return;
    
    const messageToSend = question || inputMessage;
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setInputMessage('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: user?.privyId || '1',
          question: messageToSend
        })
      });
      
      const data = await response.json();
      
      // Add AI response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.recommendation || data.error || 'No response from AI'
      }]);
    } catch (error) {
      console.error('Error asking AI:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating AI Consultant Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 z-40 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:shadow-cyan-500/50 transition-all duration-300"
      >
        <Brain className="w-5 h-5 animate-pulse" />
        <span className="font-bold text-sm uppercase tracking-wider">AI Consultant</span>
      </motion.button>

      {/* AI Consultant Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0a] border border-[#333] max-w-3xl w-full h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#333] flex items-center justify-between bg-gradient-to-r from-blue-900/20 to-cyan-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-white">AI Business Consultant</h2>
                    <p className="text-sm text-gray-400">Ask anything about your business metrics</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-10">
                    <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-serif text-white mb-2">Welcome to AI Business Consultant</h3>
                    <p className="text-gray-400 mb-6">Ask me anything about your business performance, pricing, or strategy.</p>
                    
                    <div className="space-y-2 max-w-md mx-auto">
                      <p className="text-sm text-gray-500 uppercase tracking-wider mb-3">Suggested questions:</p>
                      {suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q)}
                          className="w-full text-left px-4 py-3 bg-[#050505] border border-[#333] hover:border-cyan-500/50 text-gray-300 text-sm transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                          : 'bg-[#050505] border border-[#333] text-gray-300'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2 text-cyan-400 text-xs uppercase tracking-wider">
                          <Brain className="w-3 h-3" />
                          <span>AI Consultant</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-[#050505] border border-[#333] px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Loader className="w-4 h-4 text-cyan-400 animate-spin" />
                        <span className="text-gray-400 text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-[#333] bg-[#050505]">
                <div className="flex gap-3">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your business performance, pricing, or strategy..."
                    className="flex-1 bg-black border border-[#333] text-white px-4 py-3 rounded-lg focus:border-cyan-500 outline-none resize-none"
                    rows="2"
                    disabled={loading}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !inputMessage.trim()}
                    className="px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Business Analytics</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span>Pricing Strategy</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    <span>Powered by AWS Bedrock</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIBusinessConsultant;

