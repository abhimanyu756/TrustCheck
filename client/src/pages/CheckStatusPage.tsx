import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
import Breadcrumb from '../components/Breadcrumb';

interface Check {
    checkId: string;
    caseId: string;
    checkType: string;
    companyName: string | null;
    status: string;
    aiAgentStatus: string;
    riskScore: number;
    riskLevel: string;
    verificationData: any;
    discrepancies: string[];
    createdAt: string;
}

interface Document {
    documentId: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
}

interface CaseData {
    caseId: string;
    employeeName: string;
    employeeEmail: string;
    clientId: string;
}

interface ClientConfig {
    skuName: string;
    primaryVerificationMethod: string;
    fallbackMethod: string;
    verificationType: string;
    specialInstructions: string[];
}

interface ActivityLog {
    logId: string;
    action: string;
    description: string;
    timestamp: string;
    metadata: any;
}

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

const INSTRUCTION_LABELS: { [key: string]: string } = {
    'uan_30day_tolerance': 'UAN: 30-day tenure difference tolerance',
    'uan_dol_pf_check': 'UAN: If DOL unavailable, check last 3 months PF',
    'no_overseas_checks': 'No overseas checks',
    'utv_before_due': 'Close UTV checks before due date',
    'no_verbal_closures': 'Verbal closures not acceptable',
    'require_experience_letter': 'Do not initiate without experience letter',
    'govt_org_escalate': 'Government organizations - Escalate to CSE',
    'mandatory_5_followups': '5 follow-ups mandatory to close as UTV',
    'hr_attempts_required': 'HR attempts required before UAN verification',
    'company_not_found_escalate': 'Company not in UAN - Escalate within 2-3 days',
    'insufficiency_no_exp_letter': 'Raise insufficiency if no experience letter',
    'red_checks_escalate': 'All RED checks escalate to CSE'
};

const CheckStatusPage = () => {
    const { checkId } = useParams<{ checkId: string }>();
    const [check, setCheck] = useState<Check | null>(null);
    const [caseData, setCaseData] = useState<CaseData | null>(null);
    const [clientConfig, setClientConfig] = useState<ClientConfig | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [emails, setEmails] = useState<Email[]>([]);
    const [emailResponses, setEmailResponses] = useState<EmailResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (checkId) {
            fetchCheckDetails();
        }
    }, [checkId]);

    const fetchCheckDetails = async () => {
        try {
            // Fetch check details
            const checkResponse = await axios.get(`http://localhost:3000/api/checks/${checkId}`);
            setCheck(checkResponse.data);

            // Fetch case details
            const caseResponse = await axios.get(`http://localhost:3000/api/cases/${checkResponse.data.caseId}`);
            setCaseData(caseResponse.data);

            // Fetch client config
            const clientResponse = await axios.get(`http://localhost:3000/api/clients/${caseResponse.data.clientId}`);
            setClientConfig(clientResponse.data);

            // Fetch documents
            const docsResponse = await axios.get(`http://localhost:3000/api/document-upload/check/${checkId}`);
            setDocuments(docsResponse.data.documents);

            // Fetch activity logs
            const logsResponse = await axios.get(`http://localhost:3000/api/activity-logs/check/${checkId}`);
            setActivityLogs(logsResponse.data.logs);

            // Fetch emails
            const emailsResponse = await axios.get(`http://localhost:3000/api/emails/check/${checkId}`);
            setEmails(emailsResponse.data.emails || []);

            // Fetch email responses
            const responsesResponse = await axios.get(`http://localhost:3000/api/emails/responses/check/${checkId}`);
            setEmailResponses(responsesResponse.data.responses || []);

        } catch (error) {
            console.error('Error fetching check details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getZoneColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'LOW_RISK':
                return 'bg-green-100 border-green-300 text-green-800';
            case 'MEDIUM_RISK':
                return 'bg-yellow-100 border-yellow-300 text-yellow-800';
            case 'HIGH_RISK':
                return 'bg-red-100 border-red-300 text-red-800';
            default:
                return 'bg-slate-100 border-slate-300 text-slate-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '✅';
            case 'IN_PROGRESS': return '⏳';
            case 'FAILED': return '❌';
            case 'PENDING': return '⏸️';
            default: return '⏸️';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading check details...</p>
                </div>
            </div>
        );
    }

    if (!check) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-600">Check not found</p>
                </div>
            </div>
        );
    }

    const verificationData = check.verificationData || {};
    const emailSent = verificationData.method === 'EMAIL_VERIFICATION';
    const sheetCreated = verificationData.googleSheetsUrl ? true : false;
    const hrResponded = verificationData.verified === true;

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Logo />
                    <div className="mt-6">
                        <Breadcrumb items={[
                            { label: 'Home', path: '/' },
                            { label: 'Verify Checks', path: '/verifier' },
                            { label: 'Check Status' }
                        ]} />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Check Status Details</h1>
                            <p className="text-slate-600 mt-2">
                                {check.checkType} Verification for {caseData?.employeeName}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Risk Zone Classification */}
                    <div className={`rounded-xl shadow-sm border-2 p-6 ${getZoneColor(check.riskLevel)}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {check.riskLevel === 'LOW_RISK' && '🟢 GREEN ZONE'}
                                    {check.riskLevel === 'MEDIUM_RISK' && '🟡 YELLOW ZONE'}
                                    {check.riskLevel === 'HIGH_RISK' && '🔴 RED ZONE'}
                                    {!check.riskLevel && '⚪ PENDING CLASSIFICATION'}
                                </h2>
                                <p className="text-lg mt-1">
                                    Risk Score: <span className="font-bold">{check.riskScore || 0}/100</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-medium">Check ID</span>
                                <p className="text-xs font-mono">{check.checkId}</p>
                            </div>
                        </div>
                    </div>

                    {/* Workflow Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-xl font-semibold text-slate-800 mb-4">Verification Workflow</h3>

                        <div className="space-y-4">
                            {/* Step 1: Documents Uploaded */}
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${documents.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    {documents.length > 0 ? '✓' : '1'}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-800">Documents Uploaded</h4>
                                    <p className="text-sm text-slate-600">
                                        {documents.length} document(s) uploaded
                                    </p>
                                    {documents.length > 0 && (
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            {documents.map(doc => (
                                                <div key={doc.documentId} className="bg-slate-50 p-2 rounded text-xs">
                                                    📄 {doc.fileName}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Check Executed */}
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${check.status !== 'PENDING' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    {check.status !== 'PENDING' ? '✓' : '2'}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-800">Check Executed</h4>
                                    <p className="text-sm text-slate-600">
                                        Status: {getStatusIcon(check.status)} {check.status}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        AI Agent: {check.aiAgentStatus || 'NOT_STARTED'}
                                    </p>
                                </div>
                            </div>

                            {/* Step 3: Email Sent (Employment only) */}
                            {check.checkType === 'EMPLOYMENT' && (
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${emailSent ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {emailSent ? '✓' : '3'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800">Email Sent to HR</h4>
                                        {emails.length > 0 ? (
                                            <div className="mt-2 space-y-3">
                                                {emails.map(email => {
                                                    const response = emailResponses.find(r => r.checkId === email.checkId);
                                                    return (
                                                        <div key={email.emailId} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">To: {email.to}</p>
                                                                    <p className="text-xs text-slate-600">{email.subject}</p>
                                                                    <p className="text-xs text-slate-500 mt-1">
                                                                        Sent: {new Date(email.sentAt).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                                <span className={`text-xs px-2 py-1 rounded-full ${email.status === 'REPLIED' ? 'bg-emerald-100 text-emerald-700' :
                                                                    email.status === 'OPENED' ? 'bg-purple-100 text-purple-700' :
                                                                        email.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                                            'bg-blue-100 text-blue-700'
                                                                    }`}>
                                                                    {email.status}
                                                                </span>
                                                            </div>

                                                            {/* Email Body Link */}
                                                            <Link
                                                                to={`/email-thread/${email.emailId}`}
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline mt-2 inline-block"
                                                            >
                                                                📧 View Full Email Thread →
                                                            </Link>

                                                            {/* Google Sheet Link */}
                                                            {email.googleSheetsUrl && (
                                                                <a
                                                                    href={email.googleSheetsUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                                                                >
                                                                    📊 View Google Sheet →
                                                                </a>
                                                            )}

                                                            {/* HR Response */}
                                                            {response && (
                                                                <div className="mt-3 pt-3 border-t border-slate-300">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-emerald-600 font-semibold text-sm">💬 HR Response Received</span>
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${response.verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                            }`}>
                                                                            {response.verified ? '✓ Verified' : '✗ Not Verified'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-600">
                                                                        From: {response.hrEmail}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">
                                                                        Responded: {new Date(response.respondedAt).toLocaleString()}
                                                                    </p>
                                                                    <details className="mt-2">
                                                                        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                                                                            View Response Data
                                                                        </summary>
                                                                        <pre className="mt-2 p-2 bg-white rounded text-xs text-slate-700 overflow-auto max-h-40">
                                                                            {JSON.stringify(response.responseData, null, 2)}
                                                                        </pre>
                                                                    </details>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : emailSent ? (
                                            <>
                                                <p className="text-sm text-green-600">✓ Email sent successfully</p>
                                                <p className="text-sm text-slate-600">
                                                    To: {verificationData.hrEmail || 'N/A'}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-500">⏳ Awaiting HR response</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Google Sheet Created */}
                            {check.checkType === 'EMPLOYMENT' && (
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sheetCreated ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {sheetCreated ? '✓' : '4'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800">Google Sheet Created</h4>
                                        {sheetCreated ? (
                                            <>
                                                <p className="text-sm text-green-600">✓ Verification form created</p>
                                                <a
                                                    href={verificationData.googleSheetsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    View Google Sheet →
                                                </a>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-500">Pending sheet creation</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 5: HR Response */}
                            {check.checkType === 'EMPLOYMENT' && (
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hrResponded ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                        }`}>
                                        {hrResponded ? '✓' : '⏳'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800">HR Response</h4>
                                        {hrResponded ? (
                                            <p className="text-sm text-green-600">✓ HR has responded</p>
                                        ) : (
                                            <p className="text-sm text-yellow-600">⏳ Awaiting HR response</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Discrepancies */}
                    {check.discrepancies && check.discrepancies.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4">
                                🚨 Discrepancies Found ({check.discrepancies.length})
                            </h3>
                            <div className="space-y-2">
                                {check.discrepancies.map((discrepancy, index) => (
                                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm text-red-800">{discrepancy}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Verification Data */}
                    {Object.keys(verificationData).length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4">Verification Data</h3>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <pre className="text-xs text-slate-700 overflow-auto">
                                    {JSON.stringify(verificationData, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Client Special Instructions */}
                    {clientConfig && clientConfig.specialInstructions && clientConfig.specialInstructions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4">
                                Client Special Instructions ({clientConfig.skuName})
                            </h3>
                            <div className="space-y-2">
                                {clientConfig.specialInstructions.map((instruction, index) => (
                                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-sm text-blue-800">
                                            ✓ {INSTRUCTION_LABELS[instruction] || instruction}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Activity Log Timeline */}
                    {activityLogs.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4">
                                📋 Activity Timeline ({activityLogs.length})
                            </h3>
                            <div className="space-y-3">
                                {activityLogs.map((log) => (
                                    <div key={log.logId} className="border-l-4 border-blue-500 pl-4 py-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800">
                                                    {log.action.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-sm text-slate-600 mt-1">{log.description}</p>
                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                    <div className="mt-2 text-xs text-slate-500">
                                                        {Object.entries(log.metadata).map(([key, value]) => (
                                                            <span key={key} className="mr-3">
                                                                <span className="font-medium">{key}:</span> {String(value)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-xl font-semibold text-slate-800 mb-4">Actions</h3>
                        <div className="flex gap-3">
                            {check.status === 'PENDING' && (
                                <button
                                    onClick={() => {
                                        axios.post(`http://localhost:3000/api/checks/${checkId}/execute`)
                                            .then(() => {
                                                alert('Check executed!');
                                                fetchCheckDetails();
                                            })
                                            .catch(err => alert('Failed to execute check'));
                                    }}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Execute Check
                                </button>
                            )}
                            <button
                                onClick={fetchCheckDetails}
                                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                🔄 Refresh Status
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckStatusPage;
