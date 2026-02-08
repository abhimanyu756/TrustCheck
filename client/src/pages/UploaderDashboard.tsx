import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - worker import
import PDFWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Logo from '../components/Logo';
import Breadcrumb from '../components/Breadcrumb';
import Navbar from '../components/Navbar';

// Configure PDF.js worker with local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker;

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
    const [searchParams] = useSearchParams();
    const urlCheckId = searchParams.get('checkId');

    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<string>('');
    const [checks, setChecks] = useState<Check[]>([]);
    const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string; fileName: string; fileType: string } | null>(null);
    const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});
    const [confirmModal, setConfirmModal] = useState<{ documentId: string; fileName: string } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [autoSelectDone, setAutoSelectDone] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Load thumbnail for a document (images and PDFs)
    const loadThumbnail = async (documentId: string, fileName: string) => {
        if (thumbnails[documentId]) return; // Already loaded

        const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileName);
        const isPDF = /\.pdf$/i.test(fileName);

        if (!isImage && !isPDF) return; // Only load thumbnails for images and PDFs

        try {
            const response = await axios.get(`/api/document-upload/download/${documentId}?preview=true`, {
                responseType: 'blob'
            });

            if (isImage) {
                // For images, create object URL directly
                const url = window.URL.createObjectURL(new Blob([response.data]));
                setThumbnails(prev => ({ ...prev, [documentId]: url }));
            } else if (isPDF) {
                // For PDFs, render first page to canvas
                try {
                    const arrayBuffer = await response.data.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    const page = await pdf.getPage(1);

                    // Create canvas for thumbnail
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');

                    // Scale to create a small thumbnail
                    const viewport = page.getViewport({ scale: 0.3 });
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    if (context) {
                        await page.render({ canvasContext: context, viewport, canvas }).promise;
                        const thumbnailUrl = canvas.toDataURL('image/png');
                        setThumbnails(prev => ({ ...prev, [documentId]: thumbnailUrl }));
                    }
                } catch (pdfError) {
                    console.error('Error rendering PDF thumbnail:', pdfError);
                }
            }
        } catch (error) {
            console.error('Error loading thumbnail:', error);
        }
    };

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

    // Load thumbnails when documents change
    useEffect(() => {
        documents.forEach(doc => {
            loadThumbnail(doc.documentId, doc.fileName);
        });
    }, [documents]);

    // Auto-select check if checkId is in URL
    useEffect(() => {
        const autoSelectFromUrl = async () => {
            if (!urlCheckId || autoSelectDone) return;

            try {
                // Fetch check details to get caseId
                const checkResponse = await axios.get(`/api/checks/${urlCheckId}`);
                const checkData = checkResponse.data;

                if (checkData && checkData.caseId) {
                    // Fetch case details to get clientId
                    const caseResponse = await axios.get(`/api/cases/${checkData.caseId}`);
                    const caseData = caseResponse.data;

                    if (caseData && caseData.clientId) {
                        // Set all selections
                        setSelectedClient(caseData.clientId);
                        setSelectedCase(checkData.caseId);

                        // Wait for checks to load then select the check
                        setTimeout(async () => {
                            const checksResponse = await axios.get(`/api/checks/case/${checkData.caseId}`);
                            const checksData = checksResponse.data;
                            setChecks(checksData);

                            const targetCheck = checksData.find((c: Check) => c.checkId === urlCheckId);
                            if (targetCheck) {
                                setSelectedCheck(targetCheck);
                                showToast(`Selected ${targetCheck.checkType} check for upload`, 'success');
                            }
                        }, 100);
                    }
                }
            } catch (error) {
                console.error('Error auto-selecting from URL:', error);
            }

            setAutoSelectDone(true);
        };

        if (clients.length > 0 && !autoSelectDone) {
            autoSelectFromUrl();
        }
    }, [urlCheckId, clients, autoSelectDone]);


    const fetchClients = async () => {
        try {
            const response = await axios.get('/api/clients');
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCases = async (clientId: string) => {
        try {
            const response = await axios.get(`/api/cases/client/${clientId}`);
            setCases(response.data);
        } catch (error) {
            console.error('Error fetching cases:', error);
        }
    };

    const fetchChecks = async (caseId: string) => {
        try {
            const response = await axios.get(`/api/checks/case/${caseId}`);
            setChecks(response.data);
        } catch (error) {
            console.error('Error fetching checks:', error);
        }
    };

    const fetchDocuments = async (checkId: string) => {
        try {
            const response = await axios.get(`/api/document-upload/check/${checkId}`);
            setDocuments(response.data.documents);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const handleFileUpload = async (documentType: string, file: File) => {
        if (!selectedCheck || !selectedClient || !selectedCase) return;

        setUploadingDocType(documentType);
        const formData = new FormData();
        formData.append('document', file);
        formData.append('clientId', selectedClient);
        formData.append('caseId', selectedCase);
        formData.append('checkId', selectedCheck.checkId);
        formData.append('documentType', documentType);

        try {
            await axios.post('/api/document-upload/upload', formData);
            showToast('Document uploaded successfully!', 'success');
            fetchDocuments(selectedCheck.checkId);
        } catch (error) {
            console.error('Error uploading document:', error);
            showToast('Failed to upload document', 'error');
        } finally {
            setUploadingDocType(null);
        }
    };

    const handleDownload = async (documentId: string, fileName: string) => {
        try {
            const response = await axios.get(`/api/document-upload/download/${documentId}`, {
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

    const handlePreview = async (documentId: string, fileName: string) => {
        try {
            const response = await axios.get(`/api/document-upload/download/${documentId}?preview=true`, {
                responseType: 'blob'
            });

            // Determine MIME type based on file extension
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            let mimeType = 'application/octet-stream';
            let fileType = 'other';

            if (['jpg', 'jpeg'].includes(ext)) {
                mimeType = 'image/jpeg';
                fileType = 'image';
            } else if (ext === 'png') {
                mimeType = 'image/png';
                fileType = 'image';
            } else if (ext === 'gif') {
                mimeType = 'image/gif';
                fileType = 'image';
            } else if (ext === 'pdf') {
                mimeType = 'application/pdf';
                fileType = 'pdf';
            } else if (ext === 'docx') {
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                fileType = 'docx';
            } else if (ext === 'doc') {
                mimeType = 'application/msword';
                fileType = 'doc';
            }

            const blob = new Blob([response.data], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            setPreviewDoc({ url, fileName, fileType });
        } catch (error) {
            console.error('Error loading preview:', error);
            alert('Failed to load document preview');
        }
    };

    const handleDelete = async (documentId: string) => {
        try {
            await axios.delete(`/api/document-upload/${documentId}`);
            showToast('Document deleted successfully!', 'success');
            // Remove thumbnail from cache
            setThumbnails(prev => {
                const newThumbnails = { ...prev };
                delete newThumbnails[documentId];
                return newThumbnails;
            });
            if (selectedCheck) {
                fetchDocuments(selectedCheck.checkId);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            showToast('Failed to delete document', 'error');
        }
        setConfirmModal(null);
    };

    const requestDelete = (documentId: string, fileName: string) => {
        setConfirmModal({ documentId, fileName });
    };

    const getDocumentTypes = () => {
        if (!selectedCheck) return [];
        return DOCUMENT_TYPES[selectedCheck.checkType as keyof typeof DOCUMENT_TYPES] || [];
    };

    const isDocumentUploaded = (documentType: string) => {
        return documents.some(doc => doc.documentType === documentType);
    };

    const isImageFile = (fileName: string) => {
        return /\.(jpg|jpeg|png|gif)$/i.test(fileName);
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
        if (ext === 'pdf') return '📕';
        if (['doc', 'docx'].includes(ext)) return '📘';
        if (['xls', 'xlsx'].includes(ext)) return '📗';
        return '📄';
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
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="max-w-7xl mx-auto py-8 px-4">
                {/* Confirmation Modal */}
                {confirmModal && (
                    <div
                        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
                        onClick={() => setConfirmModal(null)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                        <span className="text-xl">⚠️</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-800">Replace Document?</h3>
                                </div>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-slate-600 mb-2">
                                    Are you sure you want to delete this document?
                                </p>
                                <p className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg truncate">
                                    📄 {confirmModal.fileName}
                                </p>
                                <p className="text-sm text-slate-500 mt-3">
                                    You can upload a new document after deletion.
                                </p>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(confirmModal.documentId)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                                >
                                    Yes, Delete & Replace
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {previewDoc && (
                    <div
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-0"
                        onClick={() => { setPreviewDoc(null); setIsFullscreen(false); }}
                    >
                        <div
                            className={`relative transition-all duration-300 ${isFullscreen ? 'w-full h-full' : 'max-w-5xl max-h-[90vh] w-full mx-4'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header Bar */}
                            <div className={`bg-slate-800 px-4 py-3 flex items-center justify-between ${isFullscreen ? '' : 'rounded-t-lg'}`}>
                                <span className="font-medium text-white truncate max-w-md">📄 {previewDoc.fileName}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsFullscreen(!isFullscreen)}
                                        className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors flex items-center gap-1"
                                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                                    >
                                        {isFullscreen ? '⬓ Exit' : '⛶ Fullscreen'}
                                    </button>
                                    <a
                                        href={previewDoc.url}
                                        download={previewDoc.fileName}
                                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        ⬇️ Download
                                    </a>
                                    <button
                                        onClick={() => { setPreviewDoc(null); setIsFullscreen(false); }}
                                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                    >
                                        ✕ Close
                                    </button>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className={`bg-white ${isFullscreen ? '' : 'rounded-b-lg'} overflow-hidden`}>
                                {previewDoc.fileType === 'image' ? (
                                    <div className={`flex items-center justify-center bg-slate-50 p-4 overflow-auto ${isFullscreen ? 'h-[calc(100vh-56px)]' : 'max-h-[80vh]'}`}>
                                        <img
                                            src={previewDoc.url}
                                            alt={previewDoc.fileName}
                                            className={`object-contain ${isFullscreen ? 'max-h-full' : 'max-w-full max-h-[75vh]'}`}
                                        />
                                    </div>
                                ) : previewDoc.fileType === 'pdf' ? (
                                    <object
                                        data={previewDoc.url}
                                        type="application/pdf"
                                        className={`w-full ${isFullscreen ? 'h-[calc(100vh-56px)]' : 'h-[80vh]'}`}
                                    >
                                        <div className="flex flex-col items-center justify-center h-[80vh] bg-slate-50">
                                            <span className="text-6xl mb-4">📕</span>
                                            <p className="text-slate-600 mb-4">PDF preview not supported in this browser</p>
                                            <a
                                                href={previewDoc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Open in New Tab
                                            </a>
                                        </div>
                                    </object>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[60vh] bg-slate-50 p-8">
                                        <span className="text-8xl mb-6">{getFileIcon(previewDoc.fileName)}</span>
                                        <p className="text-xl font-medium text-slate-700 mb-2">{previewDoc.fileName}</p>
                                        <p className="text-slate-500 mb-6 text-center">
                                            Preview not available for this file type.<br />
                                            Please download to view.
                                        </p>
                                        <a
                                            href={previewDoc.url}
                                            download={previewDoc.fileName}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                        >
                                            ⬇️ Download File
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast Notification */}
                {
                    toast && (
                        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                            }`}>
                            <div className="flex items-center gap-3">
                                <span className="text-xl">
                                    {toast.type === 'success' ? '✓' : '✕'}
                                </span>
                                <p className="font-medium">{toast.message}</p>
                            </div>
                        </div>
                    )
                }

                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <Logo />
                        <div className="mt-6">
                            <Breadcrumb items={[
                                { label: 'Home', path: '/' },
                                { label: 'Document Uploader' }
                            ]} />
                            <h1 className="text-3xl font-bold text-slate-800">Document Uploader</h1>
                            <p className="text-slate-600 mt-2">Upload verification documents for each check</p>
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

                                    {/* Removed top-level uploading banner - now shows inline */}

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
                                                            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg">
                                                                {/* Thumbnail Preview */}
                                                                <div
                                                                    className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={() => handlePreview(uploadedDoc.documentId, uploadedDoc.fileName)}
                                                                    title="Click to view full document"
                                                                >
                                                                    {thumbnails[uploadedDoc.documentId] ? (
                                                                        <img
                                                                            src={thumbnails[uploadedDoc.documentId]}
                                                                            alt={uploadedDoc.fileName}
                                                                            className="w-16 h-16 object-cover rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-colors"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center border-2 border-slate-200 hover:border-blue-500 transition-colors">
                                                                            <span className="text-2xl">{getFileIcon(uploadedDoc.fileName)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* File Info */}
                                                                <div className="flex-grow min-w-0">
                                                                    <p className="text-sm font-medium text-slate-800 truncate">{uploadedDoc.fileName}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {(uploadedDoc.fileSize / 1024).toFixed(2)} KB • {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                                                                    </p>
                                                                    <p className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onClick={() => handlePreview(uploadedDoc.documentId, uploadedDoc.fileName)}>
                                                                        👁️ Click thumbnail or here to preview
                                                                    </p>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex gap-2 flex-shrink-0">
                                                                    <button
                                                                        onClick={() => handleDownload(uploadedDoc.documentId, uploadedDoc.fileName)}
                                                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                                    >
                                                                        Download
                                                                    </button>
                                                                    <button
                                                                        onClick={() => requestDelete(uploadedDoc.documentId, uploadedDoc.fileName)}
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
                                                    ) : uploadingDocType === docType.id ? (
                                                        // Inline loading spinner for this specific row
                                                        <div className="flex items-center justify-center py-4 px-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mr-3"></div>
                                                            <span className="text-blue-700 font-medium">Uploading {docType.label}...</span>
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
                                                                disabled={uploadingDocType !== null}
                                                            />
                                                            <label
                                                                htmlFor={`file-${docType.id}`}
                                                                className={`block w-full px-4 py-3 border-2 border-dashed rounded-lg text-center transition-all
                                                                ${uploadingDocType !== null
                                                                        ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
                                                                        : 'border-slate-300 cursor-pointer hover:border-blue-500 hover:bg-blue-50'}`}
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
        </div>
    );
};

export default UploaderDashboard;

