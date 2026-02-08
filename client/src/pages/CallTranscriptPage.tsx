import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
import Breadcrumb from '../components/Breadcrumb';

interface TranscriptEntry {
    question: string;
    answer: string;
    timestamp: string;
}

interface AnalysisData {
    interpretedResponses?: Record<string, string>;
    discrepancies?: Array<{
        field: string;
        claimed: string;
        hrStated: string;
        severity: string;
    }>;
    riskScore?: number;
    riskLevel?: string;
    summary?: string;
}

interface CallData {
    callSid?: string;
    hrPhone?: string;
    employeeName?: string;
    responses?: Record<string, string>;
    rawResponses?: Record<string, string>;
    interpretedResponses?: Record<string, string>;
    conversation?: TranscriptEntry[];
    duration?: string;
    status?: string;
    analysis?: AnalysisData;
    riskScore?: number;
    riskLevel?: string;
    summary?: string;
    discrepancies?: Array<{
        field: string;
        claimed: string;
        hrStated: string;
        severity: string;
    }>;
}

const CallTranscriptPage = () => {
    const { checkId } = useParams<{ checkId: string }>();
    const [callData, setCallData] = useState<CallData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCallData = async () => {
            try {
                // Fetch activity logs to find call transcript
                const response = await axios.get(`/api/activity-logs/check/${checkId}`);
                const logs = response.data.logs || [];

                // Find CALL_COMPLETED log with transcript
                const callLog = logs.find((log: any) =>
                    log.action === 'CALL_COMPLETED' || log.action === 'CALL_VERIFICATION_DATA'
                );

                if (callLog) {
                    let metadata = callLog.metadata;
                    if (typeof metadata === 'string') {
                        metadata = JSON.parse(metadata);
                    }
                    setCallData(metadata);
                } else {
                    setError('No call transcript found for this check');
                }
            } catch (err) {
                console.error('Error fetching call transcript:', err);
                setError('Failed to load call transcript');
            } finally {
                setLoading(false);
            }
        };

        if (checkId) {
            fetchCallData();
        }
    }, [checkId]);

    const questionLabels: Record<string, string> = {
        hrConfirmed: 'Are you from the HR department?',
        employeeWorked: 'Did the employee work at your company?',
        datesConfirmed: 'Were the employment dates correct?',
        designationConfirmed: 'Was the designation correct?',
        exitVoluntary: 'Was their exit voluntary?',
        rehireEligible: 'Would you consider re-hiring them?'
    };

    const getResponseBadge = (value: string) => {
        const upper = (value || '').toUpperCase();
        if (upper === 'YES' || upper.includes('YES')) {
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">✓ Yes</span>;
        } else if (upper === 'NO' || upper.includes('NO')) {
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">✗ No</span>;
        } else {
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">? Unclear</span>;
        }
    };

    const getRiskBadge = (riskLevel: string, riskScore?: number) => {
        if (riskLevel === 'GREEN_ZONE') {
            return <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">🟢 Green Zone {riskScore !== undefined ? `(${riskScore}/100)` : ''}</span>;
        } else if (riskLevel === 'RED_ZONE') {
            return <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">🔴 Red Zone {riskScore !== undefined ? `(${riskScore}/100)` : ''}</span>;
        } else {
            return <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">🟡 Yellow Zone {riskScore !== undefined ? `(${riskScore}/100)` : ''}</span>;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading call transcript...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Logo />
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <Breadcrumb
                    items={[
                        { label: 'Dashboard', path: '/dashboard' },
                        { label: 'Check Details', path: `/check-status/${checkId}` },
                        { label: 'Call Transcript' }
                    ]}
                />

                <div className="mt-6 mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        📞 AI Call Transcript
                    </h1>
                    <p className="text-slate-600 mt-2">
                        Full conversation between TrustCheck AI and HR representative
                    </p>
                </div>

                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-600">{error}</p>
                        <Link
                            to={`/check/${checkId}`}
                            className="inline-block mt-4 text-blue-600 hover:underline"
                        >
                            ← Back to Check Details
                        </Link>
                    </div>
                ) : callData ? (
                    <div className="space-y-6">
                        {/* Call Summary Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-xl font-semibold text-slate-800 mb-4">📋 Call Summary</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {callData.callSid && (
                                    <div>
                                        <span className="font-medium text-slate-600">Call ID:</span>
                                        <span className="ml-2 text-slate-800 font-mono text-xs">{callData.callSid}</span>
                                    </div>
                                )}
                                {callData.hrPhone && (
                                    <div>
                                        <span className="font-medium text-slate-600">HR Phone:</span>
                                        <span className="ml-2 text-slate-800">{callData.hrPhone}</span>
                                    </div>
                                )}
                                {callData.duration && (
                                    <div>
                                        <span className="font-medium text-slate-600">Duration:</span>
                                        <span className="ml-2 text-slate-800">{callData.duration}</span>
                                    </div>
                                )}
                                {callData.status && (
                                    <div>
                                        <span className="font-medium text-slate-600">Status:</span>
                                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${callData.status === 'COMPLETED'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {callData.status}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Analysis Summary */}
                        {(callData.riskLevel || callData.analysis?.riskLevel) && (
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-sm border border-purple-200 p-6">
                                <h2 className="text-xl font-semibold text-slate-800 mb-4">🤖 AI Analysis Summary</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="font-medium text-slate-600">Risk Assessment:</span>
                                        {getRiskBadge(
                                            callData.riskLevel || callData.analysis?.riskLevel || 'YELLOW_ZONE',
                                            callData.riskScore || callData.analysis?.riskScore
                                        )}
                                    </div>
                                    {(callData.summary || callData.analysis?.summary) && (
                                        <div className="bg-white rounded-lg p-4 border border-purple-100">
                                            <p className="text-slate-700 italic">"{callData.summary || callData.analysis?.summary}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Interpreted Responses Table */}
                        {(callData.interpretedResponses || callData.analysis?.interpretedResponses) && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-xl font-semibold text-slate-800 mb-4">✅ Verification Responses (AI Interpreted)</h2>
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Question</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-32">AI Interpreted</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Raw Response</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {Object.entries(callData.interpretedResponses || callData.analysis?.interpretedResponses || {}).map(([key, value]) => (
                                                <tr key={key}>
                                                    <td className="px-4 py-3 text-sm text-slate-700">
                                                        {questionLabels[key] || key}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {getResponseBadge(value)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-500 italic">
                                                        "{callData.rawResponses?.[key] || callData.responses?.[key] || '-'}"
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Discrepancies Section */}
                        {((callData.discrepancies && callData.discrepancies.length > 0) ||
                            (callData.analysis?.discrepancies && callData.analysis.discrepancies.length > 0)) && (
                                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
                                    <h2 className="text-xl font-semibold text-red-800 mb-4">⚠️ Discrepancies Found</h2>
                                    <div className="space-y-3">
                                        {(callData.discrepancies || callData.analysis?.discrepancies || []).map((disc, idx) => (
                                            <div key={idx} className="bg-white rounded-lg p-4 border border-red-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-slate-700">{disc.field}</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${disc.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                                                        disc.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>{disc.severity}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-slate-500">Candidate Claimed:</span>
                                                        <p className="text-slate-700">{disc.claimed}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">HR Stated:</span>
                                                        <p className="text-slate-700">{disc.hrStated}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Fallback: Legacy Responses Table (if no interpreted responses) */}
                        {!callData.interpretedResponses && !callData.analysis?.interpretedResponses &&
                            callData.responses && Object.keys(callData.responses).length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-xl font-semibold text-slate-800 mb-4">✅ Verification Responses</h2>
                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Question</th>
                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-24">Response</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {Object.entries(callData.responses).map(([key, value]) => (
                                                    <tr key={key}>
                                                        <td className="px-4 py-3 text-sm text-slate-700">
                                                            {questionLabels[key] || key}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {getResponseBadge(value)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        {/* Full Transcript */}
                        {
                            callData.conversation && callData.conversation.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h2 className="text-xl font-semibold text-slate-800 mb-4">💬 Full Conversation</h2>
                                    <div className="space-y-4">
                                        {callData.conversation.map((entry, index) => (
                                            <div key={index} className="flex gap-4">
                                                <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                        <p className="text-xs text-purple-600 font-medium">🤖 TrustCheck AI</p>
                                                        <p className="text-sm text-slate-700 mt-1">{entry.question}</p>
                                                    </div>
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                        <p className="text-xs text-blue-600 font-medium">👤 HR Response</p>
                                                        <p className="text-sm text-slate-700 mt-1 font-medium">{entry.answer}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(entry.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        }

                        {/* Back Button */}
                        <div className="flex justify-center pt-4">
                            <Link
                                to={`/check/${checkId}`}
                                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                            >
                                ← Back to Check Details
                            </Link>
                        </div>
                    </div >
                ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                        <p className="text-slate-600">No call data available</p>
                    </div>
                )}
            </main >
        </div >
    );
};

export default CallTranscriptPage;
