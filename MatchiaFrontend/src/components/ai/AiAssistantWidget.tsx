import { useState } from 'react';
import { Loader2, MessageCircleMore, Send, Sparkles, X } from 'lucide-react';
import { aiAssistantService } from '../../services/aiAssistantService';
import { useApp } from '../../context/AppContext';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

const buildMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function AiAssistantWidget() {
  const { currentBank } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: buildMessageId(),
      role: 'assistant',
      content:
        "Bonjour, je suis Matchia AI Assistant. Posez votre question, je vous accompagne dans l’analyse et la consultation des informations de la plateforme.",
    },
  ]);

  const sendQuestion = async () => {
    const text = question.trim();
    if (!text || isLoading) {
      return;
    }

    const currentPage = typeof window !== 'undefined' ? window.location.pathname : '/';

    setError('');
    setQuestion('');
    setMessages((previous) => [
      ...previous,
      {
        id: buildMessageId(),
        role: 'user',
        content: text,
      },
    ]);
    setIsLoading(true);

    try {
      const response = await aiAssistantService.ask({
        question: text,
        currentPage,
        bankId: currentBank?.id ?? null,
        marketplaceId: null,
        storeId: null,
      });

      setMessages((previous) => [
        ...previous,
        {
          id: buildMessageId(),
          role: 'assistant',
          content: response.data?.answer || "Je n'ai pas pu générer de réponse pour le moment.",
        },
      ]);
    } catch (requestError) {
      console.error('AI assistant request failed:', requestError);
      setError("Le service Matchia AI n'est pas disponible pour le moment.");
      setMessages((previous) => [
        ...previous,
        {
          id: buildMessageId(),
          role: 'assistant',
          content: "Je n'ai pas pu traiter votre demande. Veuillez réessayer dans quelques instants.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="mb-4 flex h-[620px] w-[390px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-violet-200/70 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
          <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-violet-700 via-indigo-700 to-orange-500 px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Matchia AI Assistant</div>
                <div className="text-xs text-white/80">Back office SaaS</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl p-2 text-white/90 transition-colors hover:bg-white/10"
              aria-label="Fermer l'assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                  Analyse des données en cours...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            {error ? (
              <div className="mb-3 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                {error}
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendQuestion();
                  }
                }}
                placeholder="Posez votre question au back office SaaS..."
                rows={2}
                className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-200"
              />
              <button
                type="button"
                onClick={sendQuestion}
                disabled={!question.trim() || isLoading}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-orange-500 text-white shadow-md transition hover:from-violet-700 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Envoyer la question"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Entrée pour envoyer, Maj + Entrée pour revenir à la ligne.
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-orange-500 text-white shadow-xl transition-transform hover:scale-105"
        aria-label="Ouvrir l'assistant AI"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircleMore className="h-6 w-6" />}
      </button>
    </div>
  );
}
