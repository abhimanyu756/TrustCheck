import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

interface Client {
    clientId: string;
    companyName: string;
    skuName: string;
    contactEmail?: string;
}

interface Case {
    caseId: string;
    clientId: string;
    employeeName: string;
    employeeEmail: string;
    positionApplied: string;
    status: string;
    overallRiskLevel: string;
    createdAt: string;
}

interface Check {
    checkId: string;
    caseId: string;
    checkType: string;
    companyName: string | null;
    status: string;
    zone: string;
    riskScore: number;
    riskLevel: string;
    createdAt: string;
}

interface Stats {
    totalCases: number;
    totalChecks: number;
    greenZoneCount: number;
    redZoneCount: number;
    pendingCount: number;
    inProgressCount: number;
    completedCount: number;
}

interface ReportPreview {
    clientName: string;
    clientEmail: string;
    greenEmployees: any[];
    redEmployees: any[];
    greenCount: number;
    redCount: number;
    totalChecks: number;
}

const SupervisorDashboard = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [checks, setChecks] = useState<Check[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({
        totalCases: 0,
        totalChecks: 0,
        greenZoneCount: 0,
        redZoneCount: 0,
        pendingCount: 0,
        inProgressCount: 0,
        completedCount: 0
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterClient, setFilterClient] = useState<string>('');
    const [filterCheckType, setFilterCheckType] = useState<string>('');

    // Report modal state
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedClientForReport, setSelectedClientForReport] = useState<string>('');
    const [reportPreview, setReportPreview] = useState<ReportPreview | null>(null);
    const [reportEmail, setReportEmail] = useState('');
    const [sendingReport, setSendingReport] = useState(false);
    const [reportSent, setReportSent] = useState(false);
    const [generatingSheet, setGeneratingSheet] = useState(false);
    const [sheetUrl, setSheetUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            // Fetch all clients
            const clientsRes = await axios.get('/api/clients');
            setClients(clientsRes.data);

            // Collect all cases and checks
            const caseMap = new Map<string, Case>();
            const allChecks: Check[] = [];

            for (const client of clientsRes.data) {
                try {
                    const casesRes = await axios.get(`/api/cases/client/${client.clientId}`);
                    for (const c of casesRes.data) {
                        caseMap.set(c.caseId, { ...c, clientId: client.clientId });

                        // Fetch checks for this case
                        try {
                            const checksRes = await axios.get(`/api/checks/case/${c.caseId}`);
                            for (const check of checksRes.data) {
                                allChecks.push(check);
                            }
                        } catch (err) {
                            console.error(`Error fetching checks for case ${c.caseId}:`, err);
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching cases for client ${client.clientId}:`, err);
                }
            }

            const allCases = Array.from(caseMap.values());
            setCases(allCases);
            setChecks(allChecks);

            // Calculate stats
            const greenCount = allChecks.filter((c: Check) => c.zone === 'GREEN').length;
            const redCount = allChecks.filter((c: Check) => c.zone === 'RED').length;
            const pendingCount = allChecks.filter((c: Check) => c.status === 'PENDING').length;
            const inProgressCount = allChecks.filter((c: Check) => c.status === 'IN_PROGRESS').length;
            const completedCount = allChecks.filter((c: Check) => c.status === 'COMPLETED').length;

            setStats({
                totalCases: allCases.length,
                totalChecks: allChecks.length,
                greenZoneCount: greenCount,
                redZoneCount: redCount,
                pendingCount,
                inProgressCount,
                completedCount
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-blue-100 text-blue-700';
            case 'IN_PROGRESS': return 'bg-blue-50 text-blue-600';
            case 'FAILED': return 'bg-slate-200 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getZoneColor = (zone: string) => {
        switch (zone) {
            case 'GREEN': return 'bg-blue-600 text-white';
            case 'RED': return 'bg-slate-800 text-white';
            default: return 'bg-slate-200 text-slate-600';
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

    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.clientId === clientId);
        return client?.companyName || 'Unknown';
    };

    // Report functions
    const openReportModal = async (clientId: string) => {
        setSelectedClientForReport(clientId);
        setShowReportModal(true);
        setReportSent(false);
        setReportPreview(null);

        try {
            const res = await axios.post(`/api/reports/preview/${clientId}`);
            setReportPreview(res.data.preview);
            setReportEmail(res.data.preview.clientEmail || '');
        } catch (error) {
            console.error('Error fetching report preview:', error);
        }
    };

    const sendReport = async () => {
        if (!selectedClientForReport) return;

        setSendingReport(true);
        try {
            await axios.post(`/api/reports/client/${selectedClientForReport}`, {
                email: reportEmail
            });
            setReportSent(true);
        } catch (error) {
            console.error('Error sending report:', error);
            alert('Failed to send report. Please try again.');
        } finally {
            setSendingReport(false);
        }
    };

    const generateSheet = async () => {
        if (!selectedClientForReport) return;

        setGeneratingSheet(true);
        try {
            const res = await axios.post(`/api/reports/sheet/${selectedClientForReport}`);
            if (res.data.success) {
                setSheetUrl(res.data.data.spreadsheetUrl);
                window.open(res.data.data.spreadsheetUrl, '_blank');
            }
        } catch (error) {
            console.error('Error generating sheet:', error);
            alert('Failed to generate Google Sheet. Please try again.');
        } finally {
            setGeneratingSheet(false);
        }
    };

    const closeReportModal = () => {
        setShowReportModal(false);
        setSelectedClientForReport('');
        setReportPreview(null);
        setReportEmail('');
        setReportSent(false);
        setSheetUrl(null);
    };

    // Filter checks based on search and filters
    const filteredChecks = checks.filter(check => {
        const caseData = cases.find(c => c.caseId === check.caseId);
        const matchesSearch = searchQuery === '' ||
            check.checkId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            check.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (caseData?.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
            (check.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

        const matchesStatus = filterStatus === '' || check.status === filterStatus;
        const matchesClient = filterClient === '' || caseData?.clientId === filterClient;
        const matchesCheckType = filterCheckType === '' || check.checkType === filterCheckType;

        return matchesSearch && matchesStatus && matchesClient && matchesCheckType;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading supervisor dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">👔 Supervisor Dashboard</h1>
                        <p className="text-slate-600 mt-2">Monitor all cases, checks, and zone statuses</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            value={selectedClientForReport}
                            onChange={(e) => setSelectedClientForReport(e.target.value)}
                        >
                            <option value="">Select Client</option>
                            {clients.map(client => (
                                <option key={client.clientId} value={client.clientId}>
                                    {client.companyName}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => selectedClientForReport && openReportModal(selectedClientForReport)}
                            disabled={!selectedClientForReport}
                            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${selectedClientForReport
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            📧 Send Client Report
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <p className="text-sm text-slate-600">Total Cases</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalCases}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <p className="text-sm text-slate-600">Total Checks</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalChecks}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-4">
                        <p className="text-sm text-green-600">Green Zone</p>
                        <p className="text-2xl font-bold text-green-700">{stats.greenZoneCount}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
                        <p className="text-sm text-red-600">Red Zone</p>
                        <p className="text-2xl font-bold text-red-700">{stats.redZoneCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-4">
                        <p className="text-sm text-slate-600">Pending</p>
                        <p className="text-2xl font-bold text-slate-700">{stats.pendingCount}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-4">
                        <p className="text-sm text-blue-600">In Progress</p>
                        <p className="text-2xl font-bold text-blue-700">{stats.inProgressCount}</p>
                    </div>
                    <div className="bg-blue-100 rounded-xl shadow-sm border border-blue-200 p-4">
                        <p className="text-sm text-blue-700">Completed</p>
                        <p className="text-2xl font-bold text-blue-800">{stats.completedCount}</p>
                    </div>
                </div>

                {/* Quick Access Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link to="/zones/green" className="block">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white hover:from-green-600 hover:to-green-700 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold">✓ Green Zone</h3>
                                    <p className="text-green-100 mt-1">Verified & Low Risk Checks</p>
                                    <p className="text-3xl font-bold mt-2">{stats.greenZoneCount} checks</p>
                                </div>
                                <span className="text-5xl opacity-50">✓</span>
                            </div>
                        </div>
                    </Link>
                    <Link to="/zones/red" className="block">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white hover:from-red-600 hover:to-red-700 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold">⚠ Red Zone</h3>
                                    <p className="text-red-100 mt-1">High Risk & Flagged Checks</p>
                                    <p className="text-3xl font-bold mt-2">{stats.redZoneCount} checks</p>
                                </div>
                                <span className="text-5xl opacity-50">⚠</span>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                            <input
                                type="text"
                                placeholder="Search by Check ID, Case ID, Employee..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                            <select
                                value={filterClient}
                                onChange={(e) => setFilterClient(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.clientId} value={client.clientId}>
                                        {client.companyName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="FAILED">Failed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Check Type</label>
                            <select
                                value={filterCheckType}
                                onChange={(e) => setFilterCheckType(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Types</option>
                                <option value="EDUCATION">📚 Education</option>
                                <option value="CRIME">🔍 Crime</option>
                                <option value="EMPLOYMENT">💼 Employment</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setFilterStatus('');
                                    setFilterClient('');
                                    setFilterCheckType('');
                                }}
                                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* All Checks Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h3 className="text-xl font-semibold text-slate-800">
                            All Checks ({filteredChecks.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Check ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Zone</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Risk</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredChecks.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                            No checks found matching your criteria
                                        </td>
                                    </tr>
                                ) : (
                                    filteredChecks.map(check => {
                                        const caseData = cases.find(c => c.caseId === check.caseId);
                                        return (
                                            <tr key={check.checkId} className="hover:bg-slate-50">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-mono text-slate-800">{check.checkId}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-lg mr-2">{getCheckIcon(check.checkType)}</span>
                                                    <span className="text-sm text-slate-700">{check.checkType}</span>
                                                    {check.companyName && (
                                                        <p className="text-xs text-slate-500">{check.companyName}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-slate-800">{caseData?.employeeName || '-'}</p>
                                                    <p className="text-xs text-slate-500">{caseData?.positionApplied || ''}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-700">{getClientName(caseData?.clientId || '')}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(check.status)}`}>
                                                        {check.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {check.zone ? (
                                                        <span className={`text-xs px-2 py-1 rounded-full ${getZoneColor(check.zone)}`}>
                                                            {check.zone}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {check.riskLevel ? (
                                                        <span className={`text-sm font-medium ${check.riskLevel === 'HIGH_RISK' ? 'text-red-600' :
                                                            check.riskLevel === 'MEDIUM_RISK' ? 'text-yellow-600' :
                                                                'text-green-600'
                                                            }`}>
                                                            {check.riskScore}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        to={`/check-status/${check.checkId}`}
                                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        View Details →
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-slate-800">📧 Send Client Report</h2>
                                <button
                                    onClick={closeReportModal}
                                    className="text-slate-400 hover:text-slate-600 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {reportSent ? (
                                <div className="text-center py-8">
                                    <div className="text-6xl mb-4">✅</div>
                                    <h3 className="text-xl font-bold text-green-600 mb-2">Report Sent Successfully!</h3>
                                    <p className="text-slate-600">The verification report has been sent to the client.</p>
                                    <button
                                        onClick={closeReportModal}
                                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : reportPreview ? (
                                <>
                                    <div className="mb-6">
                                        <h3 className="font-semibold text-slate-700 mb-2">Report Preview for: {reportPreview.clientName}</h3>

                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                                                <div className="text-2xl font-bold text-green-600">{reportPreview.greenCount}</div>
                                                <div className="text-sm text-green-700">Green Zone</div>
                                            </div>
                                            <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                                                <div className="text-2xl font-bold text-red-600">{reportPreview.redCount}</div>
                                                <div className="text-sm text-red-700">Red Zone</div>
                                            </div>
                                            <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                                                <div className="text-2xl font-bold text-blue-600">{reportPreview.totalChecks}</div>
                                                <div className="text-sm text-blue-700">Total Checks</div>
                                            </div>
                                        </div>

                                        {/* Green Zone Employees */}
                                        {reportPreview.greenEmployees.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="font-medium text-green-700 mb-2">✅ Green Zone (Good to Go)</h4>
                                                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                                    {reportPreview.greenEmployees.map((emp, idx) => (
                                                        <div key={idx} className="flex justify-between py-1 border-b border-green-100 last:border-0">
                                                            <span className="font-medium">{emp.employeeName}</span>
                                                            <span className="text-sm text-green-600">{emp.checkType} - {emp.riskScore}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Red Zone Employees */}
                                        {reportPreview.redEmployees.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="font-medium text-red-700 mb-2">⚠️ Red Zone (Needs Discussion)</h4>
                                                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                                    {reportPreview.redEmployees.map((emp, idx) => (
                                                        <div key={idx} className="flex justify-between py-1 border-b border-red-100 last:border-0">
                                                            <span className="font-medium">{emp.employeeName}</span>
                                                            <span className="text-sm text-red-600">{emp.checkType} - {emp.riskScore}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Email Input */}
                                        <div className="mt-6">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Client Email
                                            </label>
                                            <input
                                                type="email"
                                                value={reportEmail}
                                                onChange={(e) => setReportEmail(e.target.value)}
                                                placeholder="Enter client email address"
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        {/* Sheet URL display */}
                                        {sheetUrl && (
                                            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                                <p className="text-sm text-green-700 font-medium">✅ Google Sheet Generated!</p>
                                                <a
                                                    href={sheetUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline text-sm"
                                                >
                                                    Open Sheet →
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={closeReportModal}
                                            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={generateSheet}
                                            disabled={generatingSheet}
                                            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${!generatingSheet
                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {generatingSheet ? 'Generating...' : '📊 Generate Sheet'}
                                        </button>
                                        <button
                                            onClick={sendReport}
                                            disabled={!reportEmail || sendingReport}
                                            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${reportEmail && !sendingReport
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {sendingReport ? 'Sending...' : '📧 Send Email'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                                    <p className="mt-4 text-slate-600">Loading report preview...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupervisorDashboard;
