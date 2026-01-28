import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import Navbar from '../components/Navbar';

interface Client {
    clientId: string;
    companyName: string;
    skuName: string;
}

interface Case {
    caseId: string;
    employeeName: string;
    employeeEmail: string;
    positionApplied: string;
    status: string;
    overallRiskLevel: string;
}

interface Check {
    checkId: string;
    checkType: string;
    companyName: string | null;
    status: string;
    aiAgentStatus: string;
    riskScore: number;
    riskLevel: string;
}

interface Document {
    documentId: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
}

const VerifierDashboard = () => {
    const { showToast } = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>(() => sessionStorage.getItem('verifier_selectedClient') || '');
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<string>(() => sessionStorage.getItem('verifier_selectedCase') || '');
    const [checks, setChecks] = useState<Check[]>([]);
    const [documents, setDocuments] = useState<{ [checkId: string]: Document[] }>({});
    const [executing, setExecuting] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            fetchCases(selectedClient);
        }
    }, [selectedClient]);

    useEffect(() => {
        if (selectedCase) {
            fetchChecks(selectedCase);
        }
    }, [selectedCase]);

    useEffect(() => {
        if (checks.length > 0) {
            checks.forEach(check => {
                fetchDocumentsForCheck(check.checkId);
            });
        }
    }, [checks]);

    const fetchClients = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/clients');
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCases = async (clientId: string) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/cases/client/${clientId}`);
            setCases(response.data);
        } catch (error) {
            console.error('Error fetching cases:', error);
        }
    };

    const fetchChecks = async (caseId: string) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/checks/case/${caseId}`);
            setChecks(response.data);
        } catch (error) {
            console.error('Error fetching checks:', error);
        }
    };

    const fetchDocumentsForCheck = async (checkId: string) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/document-upload/check/${checkId}`);
            setDocuments(prev => ({
                ...prev,
                [checkId]: response.data.documents
            }));
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const executeCheck = async (checkId: string) => {
        setExecuting(checkId);
        try {
            await axios.post(`http://localhost:3000/api/checks/${checkId}/execute`);
            showToast('Check executed successfully!', 'success');
            // Refresh checks to get updated status
            if (selectedCase) {
                fetchChecks(selectedCase);
            }
        } catch (error) {
            console.error('Error executing check:', error);
            showToast('Failed to execute check', 'error');
        } finally {
            setExecuting(null);
        }
    };

    const executeAllChecks = async () => {
        if (!selectedCase) return;

        setExecuting('all');
        try {
            await axios.post(`http://localhost:3000/api/cases/${selectedCase}/execute`);
            showToast('All checks executed successfully!', 'success');
            fetchChecks(selectedCase);
        } catch (error) {
            console.error('Error executing all checks:', error);
            showToast('Failed to execute all checks', 'error');
        } finally {
            setExecuting(null);
        }
    };

    const getCheckIcon = (checkType: string) => {
        switch (checkType) {
            case 'EDUCATION': return '📚';
            case 'CRIME': return '🔍';
            case 'EMPLOYMENT': return '💼';
            default: return '📋';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
            case 'FAILED': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'LOW_RISK': return 'text-green-600';
            case 'MEDIUM_RISK': return 'text-yellow-600';
            case 'HIGH_RISK': return 'text-red-600';
            default: return 'text-slate-600';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Selection Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Client Selection */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Select Client</h3>
                            <select
                                value={selectedClient}
                                onChange={(e) => {
                                    const newClient = e.target.value;
                                    setSelectedClient(newClient);
                                    sessionStorage.setItem('verifier_selectedClient', newClient);
                                    setSelectedCase('');
                                    sessionStorage.removeItem('verifier_selectedCase');
                                    setChecks([]);
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select Client --</option>
                                {clients.map(client => (
                                    <option key={client.clientId} value={client.clientId}>
                                        {client.companyName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Case Selection */}
                        {selectedClient && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Select Case</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {cases.map(caseItem => (
                                        <button
                                            key={caseItem.caseId}
                                            onClick={() => {
                                                setSelectedCase(caseItem.caseId);
                                                sessionStorage.setItem('verifier_selectedCase', caseItem.caseId);
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${selectedCase === caseItem.caseId
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-slate-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <p className="font-medium text-slate-800">{caseItem.employeeName}</p>
                                            <p className="text-xs text-slate-600">{caseItem.positionApplied}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${getStatusColor(caseItem.status)}`}>
                                                {caseItem.status}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Checks Panel */}
                    <div className="lg:col-span-3">
                        {selectedCase && checks.length > 0 ? (
                            <div className="space-y-6">
                                {/* Execute All Button */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-xl font-semibold text-slate-800">Verification Checks</h3>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {checks.length} check(s) found for this case
                                            </p>
                                        </div>
                                        <button
                                            onClick={executeAllChecks}
                                            disabled={executing !== null}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {executing === 'all' ? 'Executing...' : 'Execute All Checks'}
                                        </button>
                                        <Link
                                            to={`/cases/${selectedCase}/extracted-data`}
                                            className="ml-4 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                        >
                                            View Extracted Data
                                        </Link>
                                    </div>
                                </div>

                                {/* Individual Checks */}
                                {checks.map(check => {
                                    const checkDocs = documents[check.checkId] || [];

                                    return (
                                        <div key={check.checkId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">{getCheckIcon(check.checkType)}</span>
                                                    <div>
                                                        <h4 className="text-lg font-semibold text-slate-800">
                                                            {check.checkType} Check
                                                        </h4>
                                                        {check.companyName && (
                                                            <p className="text-sm text-slate-600">{check.companyName}</p>
                                                        )}
                                                        <p className="text-xs text-slate-500 mt-1">ID: {check.checkId}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(check.status)}`}>
                                                        {check.status}
                                                    </span>
                                                    {check.riskLevel && (
                                                        <p className={`text-sm font-semibold mt-2 ${getRiskColor(check.riskLevel)}`}>
                                                            {check.riskLevel} ({check.riskScore})
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Documents */}
                                            <div className="mb-4">
                                                <h5 className="text-sm font-semibold text-slate-700 mb-2">
                                                    Uploaded Documents ({checkDocs.length})
                                                </h5>
                                                {checkDocs.length > 0 ? (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        {checkDocs.map(doc => (
                                                            <div key={doc.documentId} className="bg-slate-50 p-2 rounded-lg">
                                                                <p className="text-xs font-medium text-slate-800 truncate">
                                                                    📄 {doc.fileName}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {(doc.fileSize / 1024).toFixed(1)} KB
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">No documents uploaded yet</p>
                                                )}
                                            </div>

                                            {/* Execute Button */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => executeCheck(check.checkId)}
                                                    disabled={executing !== null || check.status === 'COMPLETED'}
                                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {executing === check.checkId ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                            Executing...
                                                        </span>
                                                    ) : check.status === 'COMPLETED' ? (
                                                        '✓ Completed'
                                                    ) : (
                                                        'Execute Check'
                                                    )}
                                                </button>
                                                <Link
                                                    to={`/check-status/${check.checkId}`}
                                                    className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-center"
                                                >
                                                    View Status
                                                </Link>
                                            </div>

                                            {/* AI Agent Status */}
                                            {check.aiAgentStatus && check.aiAgentStatus !== 'NOT_STARTED' && (
                                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <p className="text-sm text-blue-700">
                                                        <span className="font-semibold">AI Agent:</span> {check.aiAgentStatus}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : selectedCase ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">📋</span>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">No Checks Found</h3>
                                <p className="text-slate-600">This case doesn't have any verification checks yet</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🔍</span>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Case</h3>
                                <p className="text-slate-600">Choose a client and case to view verification checks</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifierDashboard;
