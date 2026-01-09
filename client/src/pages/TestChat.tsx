import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Message {
    role: 'user' | 'assistant' | 'error';
    content: string;
}

export default function TestChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/chat/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input })
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'error',
                    content: `Error: ${data.error || 'Failed to get response'}\n\n${data.suggestion || ''}`
                }]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: 'error',
                content: 'Failed to connect to server. Is it running on port 3000?'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white shadow-md p-4 border-b">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">🤖 Gemini API Test Chat</h1>
                        <p className="text-sm text-gray-500 mt-1">Testing your Gemini connection</p>
                    </div>
                    <Link
                        to="/"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        ← Back to App
                    </Link>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-20">
                        <p className="text-lg">👋 Send a message to test Gemini API</p>
                        <p className="text-sm mt-2">Try: "Hello!" or "Tell me a joke"</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : msg.role === 'error'
                                        ? 'bg-red-100 text-red-800 border border-red-300'
                                        : 'bg-white text-gray-800'
                                }`}
                        >
                            <div className="text-xs font-semibold mb-1 opacity-70">
                                {msg.role === 'user' ? 'You' : msg.role === 'error' ? '⚠️ Error' : '🤖 Gemini'}
                            </div>
                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-md">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t p-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message to test Gemini..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}