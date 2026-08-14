"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your Lipi Assistant. You can ask me to summarize documents, translate Acts, extract entities, or explain complex sections. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<{ id: string, name: string }[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [docsRes, chatRes] = await Promise.all([
          fetch('/api/documents'),
          fetch('/api/chat')
        ]);
        
        if (docsRes.ok) {
          const data = await docsRes.json();
          if (data.documents) setDocuments(data.documents);
        }
        
        if (chatRes.ok) {
          const data = await chatRes.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, content: text.trim() }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          docId: selectedDocId || undefined
        })
      });

      if (!res.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, data.message]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to communicate with AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend(input);
    }
  };

  const suggestedPrompts = [
    'Summarize document', 
    'Translate to English', 
    'Extract all dates', 
    'Explain Act'
  ];

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto p-4 sm:p-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-muted-foreground text-sm">Chat with your extracted document data.</p>
        </div>
        <select 
          value={selectedDocId} 
          onChange={(e) => setSelectedDocId(e.target.value)}
          className="rounded-none border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary min-w-[200px]"
        >
          <option value="">Select Document Context...</option>
          {documents.map(doc => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 bg-card border border-border rounded-none shadow-sm flex flex-col overflow-hidden">
        {/* Chat history */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-none flex flex-shrink-0 items-center justify-center ${msg.role === 'user' ? 'bg-muted border border-border' : 'bg-primary text-primary-foreground font-bold text-xs'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-muted-foreground" /> : 'AI'}
              </div>
              <div className={`p-4 text-sm text-foreground whitespace-pre-wrap rounded-none ${msg.role === 'user' ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30 border border-border'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 max-w-3xl">
              <div className="w-8 h-8 bg-primary text-primary-foreground flex flex-shrink-0 items-center justify-center font-bold text-xs rounded-none">
                AI
              </div>
              <div className="bg-muted/30 border border-border p-4 text-sm text-foreground flex items-center rounded-none">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex gap-2 overflow-x-auto">
          {suggestedPrompts.map(prompt => (
            <button 
              key={prompt} 
              onClick={() => handleSend(prompt)}
              className="whitespace-nowrap px-3 py-1.5 bg-background border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors rounded-none"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-card border-t border-border flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents..." 
            className="flex-1 border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-none"
            disabled={isLoading}
          />
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 rounded-none"
            onClick={() => handleSend(input)}
            disabled={isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
