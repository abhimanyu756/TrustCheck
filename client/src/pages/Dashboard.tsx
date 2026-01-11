import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface VerificationRequest {
    id: string;
    candidateName: string;
    company: string;
    status: string;
    createdAt: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PENDING';
    riskScore: number | null;
    hasDiscrepancies: boolean;
}

export const Dashboard: React.FC = () => {
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/dashboard/requests');
            const data = await res.json();
            setRequests(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
            default: return 'bg-gray-100 text-gray-600 border-gray-300';
        }
    };

    const getStatusColor = (status: string) => {
        return status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Verification Dashboard</h1>
                        <p className="text-slate-600 mt-1">Monitor all background verification requests</p>
                    </div>
                    <Link
                        to="/"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        ← Back to Home
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="text-sm text-slate-500 uppercase tracking-wide">Total Requests</div>
                        <div className="text-3xl font-bold text-slate-800 mt-2">{requests.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200 bg-green-50">
                        <div className="text-sm text-green-700 uppercase tracking-wide flex items-center gap-2">
                            <span>✅</span> Green Zone
                        </div>
                        <div className="text-3xl font-bold text-green-600 mt-2">
                            {requests.filter(r => r.status?.includes('GREEN')).length}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-200 bg-yellow-50">
                        <div className="text-sm text-yellow-700 uppercase tracking-wide flex items-center gap-2">
                            <span>⚠️</span> Yellow Zone
                        </div>
                        <div className="text-3xl font-bold text-yellow-600 mt-2">
                            {requests.filter(r => r.status?.includes('YELLOW')).length}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 bg-red-50">
                        <div className="text-sm text-red-700 uppercase tracking-wide flex items-center gap-2">
                            <span>🚨</span> Red Zone
                        </div>
                        <div className="text-3xl font-bold text-red-600 mt-2">
                            {requests.filter(r => r.status?.includes('RED')).length}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="text-sm text-slate-500 uppercase tracking-wide">Pending</div>
                        <div className="text-3xl font-bold text-blue-600 mt-2">
                            {requests.filter(r => r.status === 'PENDING').length}
                        </div>
                    </div>
                </div>

                {/* Requests Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Candidate
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Company
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Risk Level
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Risk Score
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No verification requests yet. Upload a document to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-slate-800">{req.candidateName}</div>
                                                <div className="text-xs text-slate-500">ID: {req.id}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                                                {req.company || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`font-semibold ${getStatusColor(req.status)}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(req.riskLevel)}`}>
                                                    {req.riskLevel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {req.riskScore !== null ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-slate-200 rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full ${req.riskScore > 70 ? 'bg-red-500' : req.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                                style={{ width: `${req.riskScore}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">{req.riskScore}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link
                                                    to={`/verify/${req.id}`}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                >
                                                    View Details →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
