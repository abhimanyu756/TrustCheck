import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Document type configurations per check type
const DOCUMENT_TYPES = {
    EDUCATION: [
        { id: '10th_marksheet', label: '10th Marksheet', required: true },
        { id: '12th_marksheet', label: '12th Marksheet', required: true },
        { id: 'degree_marksheet', label: 'Degree Marksheet (BTech/BA/BSc)', required: true },
        { id: 'higher_education', label: 'Higher Education Certificates', required: false }
    ],
    CRIME: [
        { id: 'custom_document', label: 'Custom Document (as requested)', required: false }
    ],
    EMPLOYMENT: [
        { id: 'salary_slip', label: 'Salary Slip', required: true },
        { id: 'form16', label: 'Form 16', required: false },
        { id: 'relieving_letter', label: 'Relieving Letter', required: true },
        { id: 'epfo_document', label: 'EPFO Document', required: false },
        { id: 'arn_consent', label: 'ARN Consent Form', required: true },
        { id: 'experience_letter', label: 'Experience Letter', required: true }
    ]
};

interface Client {
    clientId: string;
    companyName: string;
    skuName: string;
}

interface Case {
    caseId: string;
    employeeName: string;
    positionApplied: string;
    checksCount: number;
}

interface Check {
    checkId: string;
    checkType: string;
    companyName: string | null;
    status: string;
}

interface Document {
    documentId: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
}

const UploaderDashboard = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<string>('');
    const [checks, setChecks] = useState<Check[]>([]);
    const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);
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
        if (selectedCheck) {
            fetchDocuments(selectedCheck.checkId);
        }
    }, [selectedCheck]);

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

    const fetchDocuments = async (checkId: string) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/document-upload/check/${checkId}`);
            setDocuments(response.data.documents);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const handleFileUpload = async (documentType: string, file: File) => {
        if (!selectedCheck || !selectedClient || !selectedCase) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('document', file);
        formData.append('clientId', selectedClient);
        formData.append('caseId', selectedCase);
        formData.append('checkId', selectedCheck.checkId);
        formData.append('documentType', documentType);

        try {
            await axios.post('http://localhost:3000/api/document-upload/upload', formData);
            alert('Document uploaded successfully!');
            fetchDocuments(selectedCheck.checkId);
        } catch (error) {
            console.error('Error uploading document:', error);
            alert('Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (documentId: string, fileName: string) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/document-upload/download/${documentId}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading document:', error);
            alert('Failed to download document');
        }
    };

    const handleDelete = async (documentId: string) => {
        if (!confirm('Are you sure you want to delete this document? You can upload a new one after deletion.')) {
            return;
        }

        try {
            await axios.delete(`http://localhost:3000/api/document-upload/${documentId}`);
            alert('Document deleted successfully!');
            if (selectedCheck) {
                fetchDocuments(selectedCheck.checkId);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Failed to delete document');
        }
    };

    const getDocumentTypes = () => {
        if (!selectedCheck) return [];
        return DOCUMENT_TYPES[selectedCheck.checkType as keyof typeof DOCUMENT_TYPES] || [];
    };

    const isDocumentUploaded = (documentType: string) => {
        return documents.some(doc => doc.documentType === documentType);
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
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Document Uploader</h1>
                            <p className="text-slate-600 mt-2">Upload verification documents for each check</p>
                        </div>
                        <Link
                            to="/"
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Selection Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Client Selection */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Select Client</h3>
                            <select
                                value={selectedClient}
                                onChange={(e) => {
                                    setSelectedClient(e.target.value);
                                    setSelectedCase('');
                                    setSelectedCheck(null);
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select Client --</option>
                                {clients.map(client => (
                                    <option key={client.clientId} value={client.clientId}>
                                        {client.companyName} {client.skuName && `(${client.skuName})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Case Selection */}
                        {selectedClient && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Select Employee</h3>
                                <select
                                    value={selectedCase}
                                    onChange={(e) => {
                                        setSelectedCase(e.target.value);
                                        setSelectedCheck(null);
                                    }}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Select Employee --</option>
                                    {cases.map(caseItem => (
                                        <option key={caseItem.caseId} value={caseItem.caseId}>
                                            {caseItem.employeeName} - {caseItem.positionApplied}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Check Selection */}
                        {selectedCase && checks.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Select Check</h3>
                                <div className="space-y-2">
                                    {checks.map(check => (
                                        <button
                                            key={check.checkId}
                                            onClick={() => setSelectedCheck(check)}
                                            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${selectedCheck?.checkId === check.checkId
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-slate-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-slate-800">
                                                        {check.checkType === 'EDUCATION' && '📚 Education'}
                                                        {check.checkType === 'CRIME' && '🔍 Crime'}
                                                        {check.checkType === 'EMPLOYMENT' && '💼 Employment'}
                                                    </p>
                                                    {check.companyName && (
                                                        <p className="text-sm text-slate-600">{check.companyName}</p>
                                                    )}
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${check.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    check.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {check.status}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Document Upload Panel */}
                    <div className="lg:col-span-2">
                        {selectedCheck ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold text-slate-800">
                                        Upload Documents for {selectedCheck.checkType} Check
                                    </h3>
                                    {selectedCheck.companyName && (
                                        <p className="text-slate-600 mt-1">Company: {selectedCheck.companyName}</p>
                                    )}
                                    <p className="text-sm text-slate-500 mt-1">Check ID: {selectedCheck.checkId}</p>
                                </div>

                                <div className="space-y-4">
                                    {getDocumentTypes().map(docType => {
                                        const uploaded = isDocumentUploaded(docType.id);
                                        const uploadedDoc = documents.find(d => d.documentType === docType.id);

                                        return (
                                            <div key={docType.id} className="border border-slate-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-800">{docType.label}</span>
                                                        {docType.required && (
                                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                                                        )}
                                                        {uploaded && (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Uploaded</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {uploaded && uploadedDoc ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-2xl">📄</span>
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">{uploadedDoc.fileName}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {(uploadedDoc.fileSize / 1024).toFixed(2)} KB • {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleDownload(uploadedDoc.documentId, uploadedDoc.fileName)}
                                                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                                >
                                                                    Download
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(uploadedDoc.documentId)}
                                                                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                                                >
                                                                    Replace
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 px-3">
                                                            Click "Replace" to delete this document and upload a new one
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <input
                                                            type="file"
                                                            id={`file-${docType.id}`}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    handleFileUpload(docType.id, file);
                                                                }
                                                            }}
                                                            className="hidden"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                        />
                                                        <label
                                                            htmlFor={`file-${docType.id}`}
                                                            className="block w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                                                        >
                                                            <span className="text-slate-600">Click to upload {docType.label}</span>
                                                            <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {uploading && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                        <p className="text-blue-700">Uploading document...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">📁</span>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Check</h3>
                                <p className="text-slate-600">Choose a client, employee, and check to upload documents</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploaderDashboard;
