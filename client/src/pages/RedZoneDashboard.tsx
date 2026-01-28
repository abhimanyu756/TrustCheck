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
    priority: string;
    createdAt: string;
    comparisonResults?: any;
}

export default function RedZoneDashboard() {
    const [checks, setChecks] = useState<Check[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [filter, setFilter] = useState('all');
    const [reviewingCheck, setReviewingCheck] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [clientFilter, setClientFilter] = useState('all');

    useEffect(() => {
        fetchRedZoneChecks();
        fetchStats();
    }, []);

    const fetchRedZoneChecks = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/zones/red');
            const data = await response.json();
            if (data.success) {
                setChecks(data.checks);
            }
        } catch (error) {
            console.error('Error fetching Red Zone checks:', error);
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

    const handleReview = async (checkId: string, decision: 'APPROVED' | 'REJECTED') => {
        try {
            const response = await fetch(`http://localhost:3000/api/zones/review/${checkId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision,
                    notes: reviewNotes,
                    reviewedBy: 'Supervisor' // In production, get from auth context
                })
            });

            const data = await response.json();
            if (data.success) {
                alert(`Check ${decision.toLowerCase()} successfully!`);
                setReviewingCheck(null);
                setReviewNotes('');
                fetchRedZoneChecks(); // Refresh list
                fetchStats(); // Refresh stats
            }
        } catch (error) {
            console.error('Error reviewing check:', error);
            alert('Failed to process review');
        }
    };

    const filteredChecks = checks.filter(check => {
        // Priority/SKU filter
        if (filter !== 'all') {
            if (filter === 'HIGH' || filter === 'MEDIUM' || filter === 'LOW') {
                if (check.priority !== filter) return false;
            } else if (check.clientSKU !== filter) {
                return false;
            }
        }

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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH': return 'bg-red-100 text-red-700 border-red-300';
            case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-300';
            case 'LOW': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            default: return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    const breadcrumbItems = [
        { label: 'Home', path: '/' },
        { label: 'Red Zone Dashboard', path: '/zones/red' }
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
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Red Zone Dashboard</h1>
                            <p className="text-slate-600">Checks requiring manual supervisor review</p>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-red-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Red Zone</p>
                                    <p className="text-3xl font-bold text-red-600">{stats.redZone}</p>
                                </div>
                                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">🔴</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Needs review</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-rose-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">High Risk</p>
                                    <p className="text-3xl font-bold text-rose-600">{stats.highRisk}</p>
                                </div>
                                <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">🚨</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Score &gt; 70</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-amber-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Medium Risk</p>
                                    <p className="text-3xl font-bold text-amber-600">{stats.mediumRisk}</p>
                                </div>
                                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">⚡</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Score 40-70</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-green-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Green Zone</p>
                                    <p className="text-3xl font-bold text-green-600">{stats.greenZone}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">✅</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Auto-approved</p>
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
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                >
                                    <option value="all">All Clients</option>
                                    {uniqueClients.map(client => (
                                        <option key={client} value={client}>{client}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Priority Filter */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Filter by Priority</label>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilter('HIGH')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'HIGH'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                                            }`}
                                    >
                                        High Priority
                                    </button>
                                    <button
                                        onClick={() => setFilter('MEDIUM')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'MEDIUM'
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                            }`}
                                    >
                                        Medium Priority
                                    </button>
                                    <button
                                        onClick={() => setFilter('LOW')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'LOW'
                                            ? 'bg-yellow-600 text-white'
                                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                            }`}
                                    >
                                        Low Priority
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="text-sm text-slate-600">
                            Showing <span className="font-bold text-red-600">{filteredChecks.length}</span> of {checks.length} checks
                        </div>
                    </div>
                </div>

                {/* Checks List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading Red Zone checks...</p>
                    </div>
                ) : filteredChecks.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">✨</div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No checks need review</h3>
                        <p className="text-slate-600">All verifications are either approved or pending</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredChecks.map(check => (
                            <div
                                key={check.checkId}
                                className={`bg-white rounded-xl p-6 shadow-sm border-2 ${check.priority === 'HIGH' ? 'border-red-300' :
                                    check.priority === 'MEDIUM' ? 'border-amber-300' :
                                        'border-yellow-300'
                                    } hover:shadow-md transition-all`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${check.priority === 'HIGH' ? 'bg-red-100' :
                                                check.priority === 'MEDIUM' ? 'bg-amber-100' :
                                                    'bg-yellow-100'
                                                }`}>
                                                <span className="text-xl">⚠️</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold text-slate-800">{check.employeeName || 'Unknown Employee'}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getPriorityColor(check.priority)}`}>
                                                        {check.priority} PRIORITY
                                                    </span>
                                                </div>
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
                                                    <p className={`text-sm font-bold ${check.riskScore > 70 ? 'text-red-600' :
                                                        check.riskScore > 40 ? 'text-amber-600' :
                                                            'text-yellow-600'
                                                        }`}>{check.riskScore || 0}/100</p>
                                                    <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[100px]">
                                                        <div
                                                            className={`h-2 rounded-full ${check.riskScore > 70 ? 'bg-red-500' :
                                                                check.riskScore > 40 ? 'bg-amber-500' :
                                                                    'bg-yellow-500'
                                                                }`}
                                                            style={{ width: `${check.riskScore || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500">Discrepancies</p>
                                                <p className="text-sm font-bold text-slate-800">
                                                    {check.comparisonResults?.discrepancies?.length || 0} found
                                                </p>
                                            </div>
                                        </div>

                                        {check.comparisonResults?.summary && (
                                            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded mb-4">
                                                <p className="text-sm font-semibold text-red-800">{check.comparisonResults.summary.message}</p>
                                                <p className="text-xs text-red-700 mt-1">{check.comparisonResults.summary.details}</p>
                                            </div>
                                        )}

                                        {/* Review Section */}
                                        {reviewingCheck === check.checkId ? (
                                            <div className="bg-slate-50 rounded-lg p-4 mt-4">
                                                <h4 className="font-semibold text-slate-800 mb-3">Supervisor Review</h4>
                                                <textarea
                                                    value={reviewNotes}
                                                    onChange={(e) => setReviewNotes(e.target.value)}
                                                    placeholder="Add review notes (optional)..."
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    rows={3}
                                                />
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleReview(check.checkId, 'APPROVED')}
                                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                                    >
                                                        ✓ Approve & Move to Green Zone
                                                    </button>
                                                    <button
                                                        onClick={() => handleReview(check.checkId, 'REJECTED')}
                                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                                    >
                                                        ✗ Reject
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setReviewingCheck(null);
                                                            setReviewNotes('');
                                                        }}
                                                        className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-col gap-2 ml-4">
                                        <Link
                                            to={`/check-status/${check.checkId}`}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center whitespace-nowrap"
                                        >
                                            View Details
                                        </Link>
                                        <Link
                                            to={`/zones/comparison/${check.checkId}`}
                                            className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-center whitespace-nowrap"
                                        >
                                            Comparison
                                        </Link>
                                        {reviewingCheck !== check.checkId && (
                                            <button
                                                onClick={() => setReviewingCheck(check.checkId)}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium whitespace-nowrap"
                                            >
                                                Review Now
                                            </button>
                                        )}
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
