import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Breadcrumb from '../components/Breadcrumb';

interface ComparisonData {
    check: any;
    comparisonResults: {
        zone: string;
        riskScore: number;
        discrepancies: any[];
        aiAnalysis: any;
        ruleEvaluation: any;
        summary: any;
    };
}

export default function ComparisonDetailsView() {
    const { checkId } = useParams();
    const [data, setData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchComparisonDetails();
    }, [checkId]);

    const fetchComparisonDetails = async () => {
        try {
            const response = await fetch(`http://localhost:3000/api/zones/comparison/${checkId}`);
            const result = await response.json();
            if (result.success) {
                setData(result);
            }
        } catch (error) {
            console.error('Error fetching comparison details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
            case 'MEDIUM': return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'LOW': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default: return 'bg-slate-100 text-slate-800 border-slate-300';
        }
    };

    const breadcrumbItems = [
        { label: 'Home', path: '/' },
        { label: data?.check?.zone === 'GREEN' ? 'Green Zone' : 'Red Zone', path: `/zones/${data?.check?.zone?.toLowerCase()}` },
        { label: 'Comparison Details', path: `/zones/comparison/${checkId}` }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-4 text-slate-600">Loading comparison details...</p>
                </div>
            </div>
        );
    }

    if (!data || !data.comparisonResults) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">❌</div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No comparison data available</h3>
                        <p className="text-slate-600 mb-6">This check hasn't been compared yet</p>
                        <Link to="/zones/green" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { check, comparisonResults } = data;

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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${comparisonResults.zone === 'GREEN'
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                    : 'bg-gradient-to-br from-red-500 to-rose-600'
                                }`}>
                                <span className="text-2xl">{comparisonResults.zone === 'GREEN' ? '✅' : '⚠️'}</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-800">Comparison Details</h1>
                                <p className="text-slate-600">Check ID: {checkId}</p>
                            </div>
                        </div>
                        <Link
                            to={`/check-status/${checkId}`}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            View Full Check Status
                        </Link>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className={`rounded-xl p-6 shadow-sm border-2 ${comparisonResults.zone === 'GREEN' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                        <p className="text-sm font-semibold text-slate-600 mb-2">Zone Assignment</p>
                        <p className={`text-3xl font-bold ${comparisonResults.zone === 'GREEN' ? 'text-green-600' : 'text-red-600'
                            }`}>{comparisonResults.zone}</p>
                        <p className="text-xs text-slate-600 mt-2">{comparisonResults.summary?.status}</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-purple-200">
                        <p className="text-sm font-semibold text-slate-600 mb-2">Risk Score</p>
                        <p className="text-3xl font-bold text-purple-600">{comparisonResults.riskScore}/100</p>
                        <div className="mt-2 bg-slate-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${comparisonResults.riskScore > 70 ? 'bg-red-500' :
                                        comparisonResults.riskScore > 40 ? 'bg-amber-500' :
                                            'bg-green-500'
                                    }`}
                                style={{ width: `${comparisonResults.riskScore}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-amber-200">
                        <p className="text-sm font-semibold text-slate-600 mb-2">Discrepancies</p>
                        <p className="text-3xl font-bold text-amber-600">{comparisonResults.discrepancies?.length || 0}</p>
                        <p className="text-xs text-slate-600 mt-2">Fields with differences</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-blue-200">
                        <p className="text-sm font-semibold text-slate-600 mb-2">Client SKU</p>
                        <p className="text-2xl font-bold text-blue-600">{comparisonResults.ruleEvaluation?.clientSKU || 'STANDARD'}</p>
                        <p className="text-xs text-slate-600 mt-2">Verification tier</p>
                    </div>
                </div>

                {/* AI Analysis */}
                {comparisonResults.aiAnalysis && (
                    <div className="bg-white rounded-xl p-6 shadow-sm mb-8 border-2 border-indigo-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <span className="text-xl">🤖</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">AI Analysis</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-600 mb-2">AI Reasoning:</p>
                                <p className="text-slate-700 leading-relaxed">{comparisonResults.aiAnalysis.reasoning}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600 mb-2">Risk Level:</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${comparisonResults.aiAnalysis.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' :
                                            comparisonResults.aiAnalysis.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                                'bg-green-100 text-green-700'
                                        }`}>
                                        {comparisonResults.aiAnalysis.riskLevel}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-600 mb-2">Confidence:</p>
                                    <p className="text-slate-700">{(comparisonResults.aiAnalysis.confidence * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                            {comparisonResults.aiAnalysis.recommendations && (
                                <div>
                                    <p className="text-sm font-semibold text-slate-600 mb-2">Recommendations:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {comparisonResults.aiAnalysis.recommendations.map((rec: string, idx: number) => (
                                            <li key={idx} className="text-slate-700">{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Discrepancies */}
                {comparisonResults.discrepancies && comparisonResults.discrepancies.length > 0 ? (
                    <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <span className="text-xl">⚡</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Discrepancies Found</h2>
                        </div>
                        <div className="space-y-4">
                            {comparisonResults.discrepancies.map((disc: any, idx: number) => (
                                <div key={idx} className={`border-2 rounded-lg p-4 ${getSeverityColor(disc.severity)}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg">{disc.field}</h3>
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold mt-1 border ${getSeverityColor(disc.severity)}`}>
                                                {disc.severity} SEVERITY
                                            </span>
                                        </div>
                                        {disc.difference && (
                                            <span className="text-sm font-semibold">Difference: {disc.difference}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white bg-opacity-50 rounded-lg p-3">
                                            <p className="text-xs font-semibold text-slate-600 mb-1">Employee Submitted:</p>
                                            <p className="font-medium">{disc.employeeValue}</p>
                                        </div>
                                        <div className="bg-white bg-opacity-50 rounded-lg p-3">
                                            <p className="text-xs font-semibold text-slate-600 mb-1">HR Verified:</p>
                                            <p className="font-medium">{disc.hrValue}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center mb-8">
                        <div className="text-5xl mb-3">✨</div>
                        <h3 className="text-xl font-bold text-green-800 mb-2">Perfect Match!</h3>
                        <p className="text-green-700">All data matches perfectly between employee and HR records</p>
                    </div>
                )}

                {/* Client Rules Evaluation */}
                {comparisonResults.ruleEvaluation && (
                    <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-xl">📋</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Client Rules Evaluation</h2>
                        </div>
                        <div className="space-y-4">
                            {comparisonResults.ruleEvaluation.rulesApplied?.map((rule: any, idx: number) => (
                                <div key={idx} className={`border-2 rounded-lg p-4 ${rule.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-800">{rule.name}</h3>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${rule.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {rule.passed ? '✓ PASSED' : '✗ FAILED'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">{rule.description}</p>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-semibold text-slate-600">Expected: </span>
                                            <span className="text-slate-800">{rule.expected}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-600">Actual: </span>
                                            <span className="text-slate-800">{rule.actual}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                {comparisonResults.summary && (
                    <div className={`rounded-xl p-6 shadow-sm border-2 ${comparisonResults.zone === 'GREEN'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${comparisonResults.zone === 'GREEN' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                <span className="text-xl">{comparisonResults.zone === 'GREEN' ? '✅' : '⚠️'}</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Final Decision</h2>
                        </div>
                        <div className="space-y-2">
                            <p className={`text-lg font-bold ${comparisonResults.zone === 'GREEN' ? 'text-green-800' : 'text-red-800'
                                }`}>{comparisonResults.summary.message}</p>
                            <p className="text-slate-700">{comparisonResults.summary.details}</p>
                            <p className="text-sm font-semibold text-slate-600 mt-4">
                                Action: {comparisonResults.summary.action}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
