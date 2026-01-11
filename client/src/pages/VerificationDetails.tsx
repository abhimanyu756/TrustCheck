import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import RiskScoreCard from '../components/RiskScoreCard';
import VerificationStatus from '../components/VerificationStatus';

const VerificationDetails = () => {
    const { id } = useParams();
    const [verification, setVerification] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchDetails();
        }
    }, [id]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const [statusRes, resultsRes] = await Promise.all([
                axios.get(`http://localhost:3000/api/verify/${id}/status`),
                axios.get(`http://localhost:3000/api/verify/${id}/results`)
            ]);

            setVerification(statusRes.data);
            if (resultsRes.data.status !== 'PENDING') {
                setResults(resultsRes.data);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading verification details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        to="/dashboard"
                        className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
                    >
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800">Verification Details</h1>
                    <p className="text-slate-600 mt-1">Request ID: {id}</p>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Status */}
                    <div>
                        <VerificationStatus requestId={id} />
                    </div>

                    {/* Right Column - Risk Score */}
                    <div>
                        {results ? (
                            <RiskScoreCard verification={results} />
                        ) : (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Risk Assessment</h3>
                                <p className="text-slate-600">
                                    Risk assessment will be available once HR completes the verification form.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Candidate Data */}
                {results?.candidateData && (
                    <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Candidate Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm text-slate-500">Name:</span>
                                <p className="font-medium text-slate-800">{results.candidateData.employeeName}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Company:</span>
                                <p className="font-medium text-slate-800">{results.candidateData.companyName}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Designation:</span>
                                <p className="font-medium text-slate-800">{results.candidateData.designation}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Dates:</span>
                                <p className="font-medium text-slate-800">{results.candidateData.dates}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Salary:</span>
                                <p className="font-medium text-slate-800">{results.candidateData.salary}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* HR Data */}
                {results?.hrData && (
                    <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">HR Verified Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm text-slate-500">Name:</span>
                                <p className="font-medium text-slate-800">{results.hrData.employeeName}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Company:</span>
                                <p className="font-medium text-slate-800">{results.hrData.companyName}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Designation:</span>
                                <p className="font-medium text-slate-800">{results.hrData.designation}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Dates:</span>
                                <p className="font-medium text-slate-800">{results.hrData.dates}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Salary:</span>
                                <p className="font-medium text-slate-800">{results.hrData.salary}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Eligible for Rehire:</span>
                                <p className="font-medium text-slate-800">{results.hrData.eligibleForRehire}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Performance Rating:</span>
                                <p className="font-medium text-slate-800">{results.hrData.performanceRating}/5</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerificationDetails;
