import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
import Breadcrumb from '../components/Breadcrumb';

interface Check {
    checkId: string;
    checkType: string;
    companyName: string | null;
    companyIndex: number | null;
    status: string;
    riskLevel: string | null;
    riskScore: number | null;
}

interface CaseData {
    caseId: string;
    employeeName: string;
    employeeEmail: string;
    positionApplied: string;
    status: string;
    overallRiskLevel: string | null;
    checks: Check[];
}

const CaseDetails = () => {
    const { caseId } = useParams();
    const [caseData, setCaseData] = useState<CaseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);

    useEffect(() => {
        if (caseId) {
            fetchCaseDetails();
        }
    }, [caseId]);

    const fetchCaseDetails = async () => {
        try {
            const response = await axios.get(`http://localhost:3000/api/cases/${caseId}`);
            setCaseData(response.data);
        } catch (error) {
            console.error('Error fetching case details:', error);
        } finally {
            setLoading(false);
        }
    };

    const executeAllChecks = async () => {
        setExecuting(true);
        try {
            await axios.post(`http://localhost:3000/api/cases/${caseId}/execute`);
            alert('All checks executed successfully!');
            fetchCaseDetails(); // Refresh data
        } catch (error) {
            console.error('Error executing checks:', error);
            alert('Failed to execute checks. Please try again.');
        } finally {
            setExecuting(false);
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
            case 'FAILED': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading case details...</p>
                </div>
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-600">Case not found</p>
                </div>
            </div>
        );
    }

    // Group checks by type
    const educationChecks = caseData.checks.filter(c => c.checkType === 'EDUCATION');
    const crimeChecks = caseData.checks.filter(c => c.checkType === 'CRIME');
    const employmentChecks = caseData.checks.filter(c => c.checkType === 'EMPLOYMENT');

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Logo />
                    <div className="mt-6">
                        <Breadcrumb items={[
                            { label: 'Home', path: '/' },
                            { label: 'Client Management', path: '/clients' },
                            { label: 'Employee Cases', path: '/clients' },
                            { label: caseData.employeeName }
                        ]} />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">{caseData.employeeName}</h1>
                            <p className="text-slate-600 mt-1">{caseData.positionApplied}</p>
                            <p className="text-sm text-slate-500 mt-1">Case ID: {caseData.caseId}</p>
                        </div>
                    </div>
                </div>

                {/* Overall Status */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Overall Status</h3>
                            <div className="flex gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(caseData.status)}`}>
                                    {caseData.status}
                                </span>
                                {caseData.overallRiskLevel && (
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(caseData.overallRiskLevel)}`}>
                                        {caseData.overallRiskLevel.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-600">Total Checks</p>
                            <p className="text-3xl font-bold text-slate-800">{caseData.checks.length}</p>
                        </div>
                    </div>
                </div>

                {/* Checks */}
                <div className="space-y-6">
                    {/* Education Check */}
                    {educationChecks.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-3">📚 Education Verification</h3>
                            {educationChecks.map(check => (
                                <div key={check.checkId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-slate-800 mb-1">Education Check</h4>
                                            <p className="text-sm text-slate-600">Check ID: {check.checkId}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                                                {check.status}
                                            </span>
                                            {check.riskLevel && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(check.riskLevel)}`}>
                                                    {check.riskLevel.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {check.riskScore !== null && (
                                        <div className="mt-4">
                                            <p className="text-sm text-slate-600 mb-2">Risk Score: {check.riskScore}/100</p>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${check.riskScore < 40 ? 'bg-green-500' : check.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${check.riskScore}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Crime Check */}
                    {crimeChecks.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-3">🔍 Crime Verification</h3>
                            {crimeChecks.map(check => (
                                <div key={check.checkId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-slate-800 mb-1">Criminal Record Check</h4>
                                            <p className="text-sm text-slate-600">Check ID: {check.checkId}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                                                {check.status}
                                            </span>
                                            {check.riskLevel && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(check.riskLevel)}`}>
                                                    {check.riskLevel.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {check.riskScore !== null && (
                                        <div className="mt-4">
                                            <p className="text-sm text-slate-600 mb-2">Risk Score: {check.riskScore}/100</p>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${check.riskScore < 40 ? 'bg-green-500' : check.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${check.riskScore}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Employment Checks */}
                    {employmentChecks.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-3">💼 Employment Verification ({employmentChecks.length} {employmentChecks.length === 1 ? 'Company' : 'Companies'})</h3>
                            <div className="space-y-3">
                                {employmentChecks.map(check => (
                                    <div key={check.checkId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-slate-800 mb-1">{check.companyName || 'Unknown Company'}</h4>
                                                <p className="text-sm text-slate-600">Check ID: {check.checkId}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                                                    {check.status}
                                                </span>
                                                {check.riskLevel && (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(check.riskLevel)}`}>
                                                        {check.riskLevel.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {check.riskScore !== null && (
                                            <div className="mt-4">
                                                <p className="text-sm text-slate-600 mb-2">Risk Score: {check.riskScore}/100</p>
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${check.riskScore < 40 ? 'bg-green-500' : check.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${check.riskScore}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CaseDetails;
