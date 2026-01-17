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
    status: 'SENT' | 'DELIVERED' | 'OPENED' | 'REPLIED';
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

const EmailInbox = () => {
    const { checkId } = useParams<{ checkId?: string }>();
    const [emails, setEmails] = useState<Email[]>([]);
    const [responses, setResponses] = useState<EmailResponse[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchEmails();

        // Auto-refresh every 10 seconds if enabled
        let interval: number;
        if (autoRefresh) {
            interval = window.setInterval(() => {
                fetchEmails();
            }, 10000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [checkId, autoRefresh]);

    const fetchEmails = async () => {
        try {
            // Fetch sent emails
            const emailsUrl = checkId
                ? `http://localhost:3000/api/emails/check/${checkId}`
                : 'http://localhost:3000/api/emails/all';
            const emailsResponse = await axios.get(emailsUrl);
            setEmails(emailsResponse.data.emails || []);

            // Fetch HR responses
            const responsesUrl = checkId
                ? `http://localhost:3000/api/emails/responses/check/${checkId}`
                : 'http://localhost:3000/api/emails/responses/all';
            const responsesResponse = await axios.get(responsesUrl);
            setResponses(responsesResponse.data.responses || []);

        } catch (error) {
            console.error('Error fetching emails:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SENT': return 'bg-blue-100 text-blue-700';
            case 'DELIVERED': return 'bg-green-100 text-green-700';
            case 'OPENED': return 'bg-purple-100 text-purple-700';
            case 'REPLIED': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SENT': return '📤';
            case 'DELIVERED': return '✓';
            case 'OPENED': return '👁';
            case 'REPLIED': return '💬';
            default: return '📧';
        }
    };

    const getResponseForEmail = (emailCheckId: string) => {
        return responses.find(r => r.checkId === emailCheckId);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 80px)' }}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                        <p className="mt-4 text-slate-600">Loading emails...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar breadcrumbs={checkId ? [{ label: 'Email Inbox', path: '/emails' }, { label: `Check ${checkId}`, path: `/emails/${checkId}` }] : [{ label: 'Email Inbox', path: '/emails' }]} />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Email Inbox</h1>
                        <p className="text-slate-600 mt-1">
                            {checkId ? `Emails for Check ${checkId}` : 'All verification emails'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded"
                            />
                            Auto-refresh (10s)
                        </label>
                        <button
                            onClick={fetchEmails}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                        >
                            🔄 Refresh Now
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-sm text-slate-600 mb-1">Total Sent</div>
                        <div className="text-2xl font-bold text-slate-800">{emails.length}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-sm text-slate-600 mb-1">Delivered</div>
                        <div className="text-2xl font-bold text-green-600">
                            {emails.filter(e => e.status === 'DELIVERED' || e.status === 'OPENED' || e.status === 'REPLIED').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-sm text-slate-600 mb-1">Opened</div>
                        <div className="text-2xl font-bold text-purple-600">
                            {emails.filter(e => e.status === 'OPENED' || e.status === 'REPLIED').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="text-sm text-slate-600 mb-1">Replied</div>
                        <div className="text-2xl font-bold text-emerald-600">
                            {emails.filter(e => e.status === 'REPLIED').length}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Email List */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="font-semibold text-slate-800">Sent Emails ({emails.length})</h2>
                        </div>
                        <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
                            {emails.length > 0 ? (
                                emails.map(email => {
                                    const response = getResponseForEmail(email.checkId);
                                    return (
                                        <button
                                            key={email.emailId}
                                            onClick={() => setSelectedEmail(email)}
                                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedEmail?.emailId === email.emailId ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(email.status)}`}>
                                                    {getStatusIcon(email.status)} {email.status}
                                                </span>
                                                {response && (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                                        ✓ Responded
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-medium text-slate-800 text-sm mb-1">To: {email.to}</p>
                                            <p className="text-xs text-slate-600 mb-1 truncate">{email.subject}</p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(email.sentAt).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Check: {email.checkId}</p>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center text-slate-500">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>No emails sent yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Email Detail */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {selectedEmail ? (
                            <>
                                <div className="p-6 border-b border-slate-200 bg-slate-50">
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-xl font-semibold text-slate-800">{selectedEmail.subject}</h2>
                                        <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(selectedEmail.status)}`}>
                                            {getStatusIcon(selectedEmail.status)} {selectedEmail.status}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-slate-600">From:</span>
                                            <span className="text-slate-800">{selectedEmail.from}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-slate-600">To:</span>
                                            <span className="text-slate-800">{selectedEmail.to}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-slate-600">Sent:</span>
                                            <span className="text-slate-800">{new Date(selectedEmail.sentAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-semibold text-slate-600">Check ID:</span>
                                            <span className="text-slate-800 font-mono text-xs">{selectedEmail.checkId}</span>
                                        </div>
                                        {selectedEmail.googleSheetsUrl && (
                                            <div className="flex gap-2">
                                                <span className="font-semibold text-slate-600">Google Sheet:</span>
                                                <a
                                                    href={selectedEmail.googleSheetsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    View Form →
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="font-semibold text-slate-800 mb-3">Email Body:</h3>
                                    <div className="bg-slate-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-slate-700 max-h-60 overflow-y-auto">
                                        {selectedEmail.body}
                                    </div>

                                    <Link
                                        to={`/email-thread/${selectedEmail.emailId}`}
                                        className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                                    >
                                        📧 View Full Email Thread →
                                    </Link>
                                </div>

                                {/* HR Response */}
                                {getResponseForEmail(selectedEmail.checkId) && (
                                    <div className="p-6 border-t border-slate-200 bg-emerald-50">
                                        <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                                            <span>💬</span> HR Response Received
                                        </h3>
                                        <div className="bg-white rounded-lg p-4">
                                            <div className="space-y-2 text-sm mb-4">
                                                <div className="flex gap-2">
                                                    <span className="font-semibold text-slate-600">Responded by:</span>
                                                    <span className="text-slate-800">{getResponseForEmail(selectedEmail.checkId)?.hrEmail}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="font-semibold text-slate-600">Responded at:</span>
                                                    <span className="text-slate-800">
                                                        {new Date(getResponseForEmail(selectedEmail.checkId)!.respondedAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="font-semibold text-slate-600">Verification Status:</span>
                                                    <span className={`font-semibold ${getResponseForEmail(selectedEmail.checkId)?.verified ? 'text-green-600' : 'text-red-600'}`}>
                                                        {getResponseForEmail(selectedEmail.checkId)?.verified ? '✓ Verified' : '✗ Not Verified'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 rounded p-3">
                                                <p className="text-xs text-slate-600 mb-1">Response Data:</p>
                                                <pre className="text-xs text-slate-700 overflow-auto">
                                                    {JSON.stringify(getResponseForEmail(selectedEmail.checkId)?.responseData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-12 text-center text-slate-500">
                                <div className="text-6xl mb-4">📧</div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Select an Email</h3>
                                <p>Choose an email from the list to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailInbox;
