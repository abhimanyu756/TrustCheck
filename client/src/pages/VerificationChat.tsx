import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

interface Discrepancy {
    field: string;
    claimed: string;
    verified: string;
    severity: string;
    analysis: string;
}

interface ComparisonResult {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    riskScore: number;
    discrepancies: Discrepancy[];
    recommendation: string;
    summary: string;
}

interface SentimentAnalysis {
    overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    redFlags: Array<{
        message: string;
        flag: string;
        severity: string;
    }>;
    trustScore: number;
    summary: string;
}

interface RequestData {
    candidateData: {
        employeeName: string;
        companyName: string;
    };
    chatHistory: ChatMessage[];
    status: string;
    comparisonResult: ComparisonResult | null;
    sentimentAnalysis: SentimentAnalysis | null;
}

export const VerificationChat: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<RequestData | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
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
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [id]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSending(true);

        try {
            await fetch(`http://localhost:3000/api/verify/${id}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content }),
            });
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    if (!request) return <div className="p-8 text-center">Loading Verification Portal...</div>;

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'HIGH': return 'bg-red-50 border-red-500 text-red-800';
            case 'MEDIUM': return 'bg-yellow-50 border-yellow-500 text-yellow-800';
            case 'LOW': return 'bg-green-50 border-green-500 text-green-800';
            default: return 'bg-gray-50 border-gray-500 text-gray-800';
        }
    };

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'NEGATIVE': return 'text-red-600';
            case 'NEUTRAL': return 'text-yellow-600';
            case 'POSITIVE': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-4xl">
                {/* Risk Analysis Card (if completed) */}
                {request.status === 'COMPLETED' && request.comparisonResult && (
                    <div className={`mb-6 p-6 rounded-xl border-l-4 shadow-lg ${getRiskColor(request.comparisonResult.overallRisk)}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold">Verification Complete</h2>
                                <p className="text-sm mt-1 opacity-80">{request.comparisonResult.summary}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold">{request.comparisonResult.riskScore}</div>
                                <div className="text-xs uppercase tracking-wide">Risk Score</div>
                            </div>
                        </div>

                        {/* Sentiment Analysis Section */}
                        {request.sentimentAnalysis && (
                            <div className="mt-4 p-4 bg-white/60 rounded-lg border border-current/20">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-sm uppercase tracking-wide">HR Sentiment Analysis</h3>
                                    <span className={`font-bold ${getSentimentColor(request.sentimentAnalysis.overallSentiment)}`}>
                                        {request.sentimentAnalysis.overallSentiment}
                                    </span>
                                </div>
                                <p className="text-xs opacity-75 mb-2">{request.sentimentAnalysis.summary}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold">Trust Score:</span>
                                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${request.sentimentAnalysis.trustScore > 70 ? 'bg-green-500' : request.sentimentAnalysis.trustScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${request.sentimentAnalysis.trustScore}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-bold">{request.sentimentAnalysis.trustScore}/100</span>
                                </div>

                                {request.sentimentAnalysis.redFlags.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        <div className="text-xs font-bold text-red-700">⚠️ Red Flags Detected:</div>
                                        {request.sentimentAnalysis.redFlags.map((flag, idx) => (
                                            <div key={idx} className="text-xs bg-red-50 p-2 rounded border border-red-200">
                                                <strong>{flag.flag}</strong> ({flag.severity}): "{flag.message}"
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {request.comparisonResult.discrepancies.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <h3 className="font-bold text-sm uppercase tracking-wide">Discrepancies Found:</h3>
                                {request.comparisonResult.discrepancies.map((disc, idx) => (
                                    <div key={idx} className="bg-white/80 p-3 rounded-lg text-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="font-semibold capitalize">{disc.field}</span>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${disc.severity === 'HIGH' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                                {disc.severity}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs space-y-1">
                                            <div><strong>Claimed:</strong> {disc.claimed}</div>
                                            <div><strong>Verified:</strong> {disc.verified}</div>
                                            <div className="italic opacity-75">{disc.analysis}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-current/20">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">Recommendation:</span>
                                <span className="px-4 py-2 bg-white/80 rounded-lg font-bold">{request.comparisonResult.recommendation}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Interface */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[600px]">
                    <div className="bg-blue-600 p-6 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-xl font-bold">TrustCheck Verification Portal</h1>
                                <p className="text-blue-100 text-sm opacity-90">
                                    Verifying: <strong>{request.candidateData.employeeName}</strong>
                                </p>
                                <p className="text-xs text-blue-200 mt-1">
                                    Chat with our AI agent to confirm employment details.
                                </p>
                            </div>
                            <Link to="/dashboard" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors">
                                ← Dashboard
                            </Link>
                        </div>
                    </div>

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

                    <div className="p-4 bg-white border-t flex gap-2">
                        <input
                            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type your response..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            disabled={sending || request.status === 'COMPLETED'}
                        />
                        <button
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                            onClick={sendMessage}
                            disabled={sending || request.status === 'COMPLETED'}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
