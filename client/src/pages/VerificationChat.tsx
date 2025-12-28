import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

interface RequestData {
    candidateData: {
        employeeName: string;
        companyName: string;
        // other fields
    };
    chatHistory: ChatMessage[];
    status: string;
}

export const VerificationChat: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<RequestData | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        // Poll for updates (in real app use WebSockets)
        const fetchData = async () => {
            try {
                const res = await fetch(`http://localhost:3000/api/verify/${id}`);
                const data = await res.json();
                setRequest(data);
                if (data.chatHistory) setMessages(data.chatHistory);
            } catch (err) {
                console.error(err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, [id]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        // Optimistic Update
        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSending(true);

        try {
            const res = await fetch(`http://localhost:3000/api/verify/${id}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content }),
            });

            const data = await res.json();
            // Server response will be fetched by poller, but we can set it here too if needed
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    if (!request) return <div className="p-8 text-center">Loading Verification Portal...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white">
                    <h1 className="text-xl font-bold">TrustCheck Verification Portal</h1>
                    <p className="text-blue-100 text-sm opacity-90">
                        Verifying: <strong>{request.candidateData.employeeName}</strong>
                    </p>
                    <p className="text-xs text-blue-200 mt-1">
                        Please chat with our AI agent to confirm employment details.
                    </p>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                    <div className="flex justify-start">
                        <div className="bg-white border text-slate-700 p-3 rounded-tr-lg rounded-br-lg rounded-bl-lg max-w-[80%] shadow-sm text-sm">
                            Hello. I am the AI Investigator from TrustCheck. I would like to verify the details for <b>{request.candidateData.employeeName}</b>.
                            <br /><br />
                            Could you please confirm if they worked at <b>{request.candidateData.companyName}</b>?
                        </div>
                    </div>

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-[80%] text-sm shadow-sm
                ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tl-lg rounded-bl-lg rounded-br-none'
                                    : 'bg-white border text-slate-700 rounded-tr-lg rounded-br-lg rounded-bl-none'}
              `}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {sending && <div className="text-xs text-slate-400 italic ml-2">Agent is typing...</div>}
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t flex gap-2">
                    <input
                        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type your response..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={sending}
                    />
                    <button
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                        onClick={sendMessage}
                        disabled={sending}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
