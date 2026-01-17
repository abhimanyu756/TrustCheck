import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

interface Check {
    checkId: string;
    checkType: string;
    status: string;
    riskLevel: string;
    riskScore: number;
    discrepancies: string[];
}

interface Case {
    caseId: string;
    employeeName: string;
    employeeEmail: string;
    positionApplied: string;
    status: string;
    checks: Check[];
}

interface Client {
    clientId: string;
    companyName: string;
    skuName: string;
    cases: Case[];
}

interface Stats {
    totalClients: number;
    totalCases: number;
    totalChecks: number;
    riskZones: {
        green: number;
        yellow: number;
        red: number;
    };
    status: {
        completed: number;
        pending: number;
        inProgress: number;
    };
}

const StatusDashboard = () => {
    const [dashboardData, setDashboardData] = useState<Client[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
    const [filterRiskZone, setFilterRiskZone] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDashboardData();
        fetchStats();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/dashboard/overview');
            setDashboardData(response.data.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/dashboard/stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const toggleClient = (clientId: string) => {
        const newExpanded = new Set(expandedClients);
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId);
        } else {
            newExpanded.add(clientId);
        }
        setExpandedClients(newExpanded);
    };

    const toggleCase = (caseId: string) => {
        const newExpanded = new Set(expandedCases);
        if (newExpanded.has(caseId)) {
            newExpanded.delete(caseId);
        } else {
            newExpanded.add(caseId);
        }
        setExpandedCases(newExpanded);
    };

    const getRiskZoneColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'LOW_RISK':
                return 'bg-green-100 border-green-300 text-green-800';
            case 'MEDIUM_RISK':
                return 'bg-yellow-100 border-yellow-300 text-yellow-800';
            case 'HIGH_RISK':
                return 'bg-red-100 border-red-300 text-red-800';
            default:
                return 'bg-slate-100 border-slate-300 text-slate-600';
        }
    };

    const getRiskZoneBadge = (riskLevel: string) => {
        switch (riskLevel) {
            case 'LOW_RISK':
                return '🟢 GREEN ZONE';
            case 'MEDIUM_RISK':
                return '🟡 YELLOW ZONE';
            case 'HIGH_RISK':
                return '🔴 RED ZONE';
            default:
                return '⚪ PENDING';
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

    const filteredData = dashboardData.filter(client => {
        const matchesSearch = client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.cases.some(c => c.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));

        if (filterRiskZone === 'all') return matchesSearch;

        const hasMatchingRisk = client.cases.some(c =>
            c.checks.some(check => {
                if (filterRiskZone === 'green') return check.riskLevel === 'LOW_RISK';
                if (filterRiskZone === 'yellow') return check.riskLevel === 'MEDIUM_RISK';
                if (filterRiskZone === 'red') return check.riskLevel === 'HIGH_RISK';
                return false;
            })
        );

        return matchesSearch && hasMatchingRisk;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 80px)' }}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                        <p className="mt-4 text-slate-600">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="text-sm text-slate-600 mb-1">Total Clients</div>
                            <div className="text-3xl font-bold text-slate-800">{stats.totalClients}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="text-sm text-slate-600 mb-1">Total Cases</div>
                            <div className="text-3xl font-bold text-slate-800">{stats.totalCases}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="text-sm text-slate-600 mb-1">Total Checks</div>
                            <div className="text-3xl font-bold text-slate-800">{stats.totalChecks}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="text-sm text-slate-600 mb-1">Risk Zones</div>
                            <div className="flex gap-2 mt-2">
                                <span className="text-green-600 font-bold">🟢 {stats.riskZones.green}</span>
                                <span className="text-yellow-600 font-bold">🟡 {stats.riskZones.yellow}</span>
                                <span className="text-red-600 font-bold">🔴 {stats.riskZones.red}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex gap-4 items-center">
                        <input
                            type="text"
                            placeholder="Search by client or employee name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={filterRiskZone}
                            onChange={(e) => setFilterRiskZone(e.target.value)}
                            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Risk Zones</option>
                            <option value="green">🟢 Green Zone Only</option>
                            <option value="yellow">🟡 Yellow Zone Only</option>
                            <option value="red">🔴 Red Zone Only</option>
                        </select>
                    </div>
                </div>

                {/* Clients List */}
                <div className="space-y-4">
                    {filteredData.map(client => (
                        <div key={client.clientId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Client Header */}
                            <button
                                onClick={() => toggleClient(client.clientId)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">🏢</span>
                                    <div className="text-left">
                                        <h3 className="text-lg font-semibold text-slate-800">{client.companyName}</h3>
                                        <p className="text-sm text-slate-600">SKU: {client.skuName || 'N/A'} • {client.cases.length} case(s)</p>
                                    </div>
                                </div>
                                <span className="text-slate-400">
                                    {expandedClients.has(client.clientId) ? '▼' : '▶'}
                                </span>
                            </button>

                            {/* Cases (Expanded) */}
                            {expandedClients.has(client.clientId) && (
                                <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                                    {client.cases.map(caseItem => (
                                        <div key={caseItem.caseId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                            {/* Case Header */}
                                            <button
                                                onClick={() => toggleCase(caseItem.caseId)}
                                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">👤</span>
                                                    <div className="text-left">
                                                        <p className="font-medium text-slate-800">{caseItem.employeeName}</p>
                                                        <p className="text-xs text-slate-600">{caseItem.positionApplied} • {caseItem.checks.length} check(s)</p>
                                                    </div>
                                                </div>
                                                <span className="text-slate-400 text-sm">
                                                    {expandedCases.has(caseItem.caseId) ? '▼' : '▶'}
                                                </span>
                                            </button>

                                            {/* Checks (Expanded) */}
                                            {expandedCases.has(caseItem.caseId) && (
                                                <div className="border-t border-slate-200 p-3 space-y-2">
                                                    {caseItem.checks.map(check => (
                                                        <Link
                                                            key={check.checkId}
                                                            to={`/check-status/${check.checkId}`}
                                                            className={`block p-4 rounded-lg border-2 ${getRiskZoneColor(check.riskLevel)} hover:shadow-md transition-all`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-2xl">{getCheckIcon(check.checkType)}</span>
                                                                    <div>
                                                                        <p className="font-semibold">{check.checkType} Check</p>
                                                                        <p className="text-sm mt-1">{getRiskZoneBadge(check.riskLevel)}</p>
                                                                        <p className="text-xs mt-1">Score: {check.riskScore || 0}/100</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs px-2 py-1 bg-white rounded">
                                                                    {check.status}
                                                                </span>
                                                            </div>

                                                            {/* Discrepancies (Reasons) */}
                                                            {check.discrepancies && check.discrepancies.length > 0 && (
                                                                <div className="mt-3 pt-3 border-t border-current/20">
                                                                    <p className="text-xs font-semibold mb-1">Reasons for {getRiskZoneBadge(check.riskLevel)}:</p>
                                                                    <ul className="text-xs space-y-1">
                                                                        {check.discrepancies.slice(0, 2).map((disc, idx) => (
                                                                            <li key={idx}>• {disc}</li>
                                                                        ))}
                                                                        {check.discrepancies.length > 2 && (
                                                                            <li className="font-medium">+ {check.discrepancies.length - 2} more...</li>
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredData.length === 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">🔍</span>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Results Found</h3>
                            <p className="text-slate-600">Try adjusting your search or filters</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatusDashboard;
