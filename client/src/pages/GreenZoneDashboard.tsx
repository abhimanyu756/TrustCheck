import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Breadcrumb from '../components/Breadcrumb';

interface Check {
    checkId: string;
    caseId: string;
    clientId: string;
    clientName: string;
    clientSKU: string;
    employeeName: string;
    checkType: string;
    status: string;
    zone: string;
    riskScore: number;
    createdAt: string;
    comparisonResults?: any;
}

export default function GreenZoneDashboard() {
    const [checks, setChecks] = useState<Check[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [clientFilter, setClientFilter] = useState('all');

    useEffect(() => {
        fetchGreenZoneChecks();
        fetchStats();
    }, []);

    const fetchGreenZoneChecks = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/zones/green');
            const data = await response.json();
            if (data.success) {
                setChecks(data.checks);
            }
        } catch (error) {
            console.error('Error fetching Green Zone checks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/zones/stats');
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const filteredChecks = checks.filter(check => {
        // SKU filter
        if (filter !== 'all' && check.clientSKU !== filter) return false;

        // Client filter
        if (clientFilter !== 'all' && check.clientName !== clientFilter) return false;

        // Search filter (Check ID, Case ID, Employee Name)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                check.checkId.toLowerCase().includes(query) ||
                check.caseId.toLowerCase().includes(query) ||
                (check.employeeName && check.employeeName.toLowerCase().includes(query))
            );
        }

        return true;
    });

    const uniqueClients = Array.from(new Set(checks.map(c => c.clientName))).sort();

    const breadcrumbItems = [
        { label: 'Home', path: '/' },
        { label: 'Green Zone Dashboard', path: '/zones/green' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <Logo />
                    <Breadcrumb items={breadcrumbItems} />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">✅</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Green Zone Dashboard</h1>
                            <p className="text-slate-600">Auto-approved verifications with low risk scores</p>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-green-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Green Zone</p>
                                    <p className="text-3xl font-bold text-green-600">{stats.greenZone}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">🟢</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Auto-approved checks</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-blue-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Verified</p>
                                    <p className="text-3xl font-bold text-blue-600">{stats.verified}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">✓</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Completed verifications</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-purple-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Avg Risk Score</p>
                                    <p className="text-3xl font-bold text-purple-600">{stats.averageRiskScore.toFixed(1)}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">📊</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Out of 100</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-amber-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Total Checks</p>
                                    <p className="text-3xl font-bold text-amber-600">{stats.total}</p>
                                </div>
                                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">📋</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">All verifications</p>
                        </div>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                    <div className="space-y-4">
                        {/* Search Bar */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Search</label>
                            <input
                                type="text"
                                placeholder="Search by Check ID, Case ID, or Employee Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>

                        {/* Filters Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Client Filter */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Filter by Client</label>
                                <select
                                    value={clientFilter}
                                    onChange={(e) => setClientFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="all">All Clients</option>
                                    {uniqueClients.map(client => (
                                        <option key={client} value={client}>{client}</option>
                                    ))}
                                </select>
                            </div>

                            {/* SKU Filter */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Filter by SKU</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['all', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'].map(sku => (
                                        <button
                                            key={sku}
                                            onClick={() => setFilter(sku)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === sku
                                                ? 'bg-green-600 text-white'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                        >
                                            {sku === 'all' ? 'All' : sku}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="text-sm text-slate-600">
                            Showing <span className="font-bold text-green-600">{filteredChecks.length}</span> of {checks.length} checks
                        </div>
                    </div>
                </div>

                {/* Checks List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading Green Zone checks...</p>
                    </div>
                ) : filteredChecks.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No checks in Green Zone yet</h3>
                        <p className="text-slate-600">Approved verifications will appear here automatically</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredChecks.map(check => (
                            <div
                                key={check.checkId}
                                className="bg-white rounded-xl p-6 shadow-sm border-2 border-green-100 hover:border-green-300 transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                <span className="text-xl">✅</span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">{check.employeeName || 'Unknown Employee'}</h3>
                                                <p className="text-xs text-slate-500">{check.checkType} Verification</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Client</p>
                                                <p className="text-sm text-slate-800">{check.clientName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Case ID</p>
                                                <p className="text-sm text-slate-800 font-mono">{check.caseId}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Check ID</p>
                                                <p className="text-sm text-slate-800 font-mono">{check.checkId}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">SKU Tier</p>
                                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                                    {check.clientSKU}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Risk Score</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-green-600">{check.riskScore || 0}/100</p>
                                                    <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[100px]">
                                                        <div
                                                            className="bg-green-500 h-2 rounded-full"
                                                            style={{ width: `${check.riskScore || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Status</p>
                                                <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                                    {check.status}
                                                </span>
                                            </div>
                                        </div>

                                        {check.comparisonResults?.summary && (
                                            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                                                <p className="text-sm font-semibold text-green-800">{check.comparisonResults.summary.message}</p>
                                                <p className="text-xs text-green-700 mt-1">{check.comparisonResults.summary.details}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 ml-4">
                                        <Link
                                            to={`/check-status/${check.checkId}`}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                                        >
                                            View Details
                                        </Link>
                                        <Link
                                            to={`/zones/comparison/${check.checkId}`}
                                            className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-center"
                                        >
                                            Comparison
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
