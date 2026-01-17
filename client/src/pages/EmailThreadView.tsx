import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

interface Email {
    emailId: string;
    checkId: string;
    to: string;
    from: string;
    subject: string;
    body: string;
    sentAt: string;
    status: string;
    googleSheetsUrl?: string;
}

interface EmailResponse {
    responseId: string;
    checkId: string;
    respondedAt: string;
    hrEmail: string;
    responseData: any;
    verified: boolean;
}

const EmailThreadView = () => {
    const { emailId } = useParams<{ emailId: string }>();
    const [email, setEmail] = useState<Email | null>(null);
    const [response, setResponse] = useState<EmailResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmailThread();
    }, [emailId]);

    const fetchEmailThread = async () => {
        try {
            // Fetch all emails and find the one we need
            const emailsResponse = await axios.get('http://localhost:3000/api/emails/all');
            const foundEmail = emailsResponse.data.emails.find((e: Email) => e.emailId === emailId);

            if (foundEmail) {
                setEmail(foundEmail);

                // Fetch response for this check
                const responsesResponse = await axios.get(`http://localhost:3000/api/emails/responses/check/${foundEmail.checkId}`);
                if (responsesResponse.data.responses.length > 0) {
                    setResponse(responsesResponse.data.responses[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching email thread:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SENT': return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'DELIVERED': return 'bg-green-100 text-green-700 border-green-300';
            case 'OPENED': return 'bg-purple-100 text-purple-700 border-purple-300';
            case 'REPLIED': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
            default: return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 80px)' }}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                        <p className="mt-4 text-slate-600">Loading email thread...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!email) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="text-6xl mb-4">📧</div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Email Not Found</h2>
                        <p className="text-slate-600 mb-6">The email you're looking for doesn't exist.</p>
                        <Link to="/emails" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            ← Back to Email Inbox
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar breadcrumbs={[
                { label: 'Email Inbox', path: '/emails' },
                { label: 'Email Thread', path: `/email-thread/${emailId}` }
            ]} />

            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Link to="/emails" className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block">
                        ← Back to Inbox
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">{email.subject}</h1>
                            <p className="text-slate-600 mt-2">
                                Email Thread for Check: <span className="font-mono text-sm">{email.checkId}</span>
                            </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full border-2 font-semibold text-sm ${getStatusColor(email.status)}`}>
                            {email.status}
                        </span>
                    </div>
                </div>

                {/* Email Thread */}
                <div className="space-y-6">
                    {/* Original Email */}
                    <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">T</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800">{email.from}</span>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Sender</span>
                                    </div>
                                    <p className="text-sm text-slate-600">To: {email.to}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-600">{new Date(email.sentAt).toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-500">{new Date(email.sentAt).toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <h2 className="text-lg font-semibold text-slate-800">{email.subject}</h2>
                        </div>

                        <div className="p-6">
                            <div className="prose max-w-none">
                                <div
                                    className="text-slate-700 leading-relaxed whitespace-pre-wrap"
                                    style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}
                                >
                                    {email.body}
                                </div>
                            </div>

                            {email.googleSheetsUrl && (
                                <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">📊</span>
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800">Verification Form Attached</p>
                                            <p className="text-sm text-slate-600">Google Sheets verification form for HR to fill</p>
                                        </div>
                                        <a
                                            href={email.googleSheetsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                                        >
                                            Open Form →
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HR Response */}
                    {response ? (
                        <div className="bg-white rounded-xl shadow-sm border-2 border-emerald-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-emerald-200">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">HR</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-800">{response.hrEmail}</span>
                                            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">HR Response</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${response.verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {response.verified ? '✓ Verified' : '✗ Not Verified'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600">Response to verification request</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-600">{new Date(response.respondedAt).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-500">{new Date(response.respondedAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <h2 className="text-lg font-semibold text-slate-800">RE: {email.subject}</h2>
                            </div>

                            <div className="p-6">
                                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-4">
                                    <p className="text-sm font-semibold text-emerald-800 mb-2">✓ HR has completed the verification form</p>
                                    <p className="text-xs text-emerald-700">The information provided has been recorded and analyzed.</p>
                                </div>

                                <h3 className="font-semibold text-slate-800 mb-3">Verification Data Provided:</h3>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <pre className="text-sm text-slate-700 overflow-auto whitespace-pre-wrap">
                                        {JSON.stringify(response.responseData, null, 2)}
                                    </pre>
                                </div>

                                <div className="mt-4 flex gap-3">
                                    <Link
                                        to={`/check-status/${email.checkId}`}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                                    >
                                        View Full Check Status →
                                    </Link>
                                    {email.googleSheetsUrl && (
                                        <a
                                            href={email.googleSheetsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                                        >
                                            View Google Sheet →
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border-2 border-yellow-200 p-8 text-center">
                            <div className="text-5xl mb-3">⏳</div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Awaiting HR Response</h3>
                            <p className="text-slate-600 mb-4">
                                The verification email has been sent to HR. We're waiting for them to complete the form.
                            </p>
                            {email.googleSheetsUrl && (
                                <a
                                    href={email.googleSheetsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                                >
                                    View Verification Form →
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Thread Info */}
                <div className="mt-8 bg-slate-100 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-800 mb-2">Thread Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-600">Email ID:</span>
                            <span className="ml-2 font-mono text-slate-800">{email.emailId}</span>
                        </div>
                        <div>
                            <span className="text-slate-600">Check ID:</span>
                            <span className="ml-2 font-mono text-slate-800">{email.checkId}</span>
                        </div>
                        <div>
                            <span className="text-slate-600">Status:</span>
                            <span className="ml-2 font-semibold text-slate-800">{email.status}</span>
                        </div>
                        <div>
                            <span className="text-slate-600">Messages:</span>
                            <span className="ml-2 font-semibold text-slate-800">{response ? '2' : '1'} (Original + {response ? 'Response' : 'No response yet'})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailThreadView;
