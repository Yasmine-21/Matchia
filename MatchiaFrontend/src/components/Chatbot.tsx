import { useState } from 'react';
import { Bot, Send, X, Loader2, MessageCircle } from 'lucide-react';
import { chatbotService } from '../services/chatbotService';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

export function Chatbot({
  storeName,
  primaryColor = '#f97316',
}: {
  storeName?: string;
  primaryColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      content: storeName
        ? `Bonjour, je peux vous aider pour les offres du store ${storeName}.`
        : 'Bonjour, comment puis-je vous aider ?',
    },
  ]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);

    try {
      const response = await chatbotService.sendMessage(text);
      setMessages((prev) => [...prev, { role: 'bot', content: response.data.reply }]);
    } catch (error) {
      console.error('Chatbot request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: "Le service chatbot n'est pas joignable pour le moment.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 flex h-[520px] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30" style={{ color: primaryColor }}>
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Assistant Matchia</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{storeName || 'Marketplace'}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Fermer le chatbot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4 dark:bg-gray-950">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'text-white'
                      : 'border border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                  }`}
                  style={message.role === 'user' ? { backgroundColor: primaryColor } : undefined}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redaction...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendMessage();
                }}
                placeholder="Ecrire un message..."
                className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-105"
        style={{ backgroundColor: primaryColor }}
        aria-label="Ouvrir le chatbot"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
