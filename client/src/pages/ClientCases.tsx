import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

interface Case {
    caseId: string;
    employeeName: string;
    employeeEmail: string;
    positionApplied: string;
    status: string;
    overallRiskLevel: string | null;
    checksCount: number;
    completedChecks: number;
    createdAt: string;
}

const ClientCases = () => {
    const { clientId } = useParams();
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (clientId) {
            fetchCases();
        }
    }, [clientId]);

    const fetchCases = async () => {
        try {
            const response = await axios.get(`http://localhost:3000/api/cases/client/${clientId}`);
            setCases(response.data);
        } catch (error) {
            console.error('Error fetching cases:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (riskLevel: string | null) => {
        switch (riskLevel) {
            case 'LOW_RISK': return 'bg-green-100 text-green-700';
            case 'MEDIUM_RISK': return 'bg-yellow-100 text-yellow-700';
            case 'HIGH_RISK': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
            case 'PENDING': return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading cases...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        to="/clients"
                        className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
                    >
                        ← Back to Clients
                    </Link>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Employee Cases</h1>
                            <p className="text-slate-600 mt-2">{cases.length} employee verification{cases.length !== 1 ? 's' : ''}</p>
                        </div>
                        <Link
                            to={`/clients/${clientId}/employees/add`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            + Add More Employees
                        </Link>
                    </div>
                </div>

                {/* Cases Grid */}
                {cases.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">👥</span>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Employees Yet</h3>
                        <p className="text-slate-600 mb-6">Add employees to start background verification</p>
                        <Link
                            to={`/clients/${clientId}/employees/add`}
                            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Add Employees
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cases.map((caseItem) => (
                            <Link
                                key={caseItem.caseId}
                                to={`/cases/${caseItem.caseId}`}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl">👤</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                                            {caseItem.status}
                                        </span>
                                        {caseItem.overallRiskLevel && (
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(caseItem.overallRiskLevel)}`}>
                                                {caseItem.overallRiskLevel.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-slate-800 mb-1">{caseItem.employeeName}</h3>
                                <p className="text-sm text-slate-600 mb-4">{caseItem.positionApplied}</p>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Total Checks:</span>
                                        <span className="font-medium text-slate-800">{caseItem.checksCount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Completed:</span>
                                        <span className="font-medium text-slate-800">{caseItem.completedChecks}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${(caseItem.completedChecks / caseItem.checksCount) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                        {new Date(caseItem.createdAt).toLocaleDateString()}
                                    </span>
                                    <span className="text-blue-600 font-medium text-sm">View Details →</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientCases;
