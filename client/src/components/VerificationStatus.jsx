import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VerificationStatus.css';

const VerificationStatus = ({ requestId }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (requestId) {
            fetchStatus();
            // Poll every 30 seconds
            const interval = setInterval(fetchStatus, 30000);
            return () => clearInterval(interval);
        }
    }, [requestId]);

    const fetchStatus = async () => {
        try {
            const response = await axios.get(`http://localhost:3000/api/verify/${requestId}/status`);
            setStatus(response.data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleManualFetch = async () => {
        try {
            setLoading(true);
            const response = await axios.post(`http://localhost:3000/api/verify/${requestId}/fetch-and-compare`);
            if (response.data.success) {
                await fetchStatus();
                alert('Verification completed successfully!');
            } else {
                alert(response.data.message);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !status) {
        return (
            <div className="verification-status loading">
                <div className="spinner"></div>
                <p>Loading status...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="verification-status error">
                <p>❌ Error: {error}</p>
            </div>
        );
    }

    if (!status) return null;

    const getStatusBadge = () => {
        if (status.status?.includes('GREEN')) {
            return <span className="status-badge green">✅ Verified - Green Zone</span>;
        } else if (status.status?.includes('YELLOW')) {
            return <span className="status-badge yellow">⚠️ Verified - Yellow Zone</span>;
        } else if (status.status?.includes('RED')) {
            return <span className="status-badge red">🚨 Verified - Red Zone</span>;
        } else if (status.hrResponded) {
            return <span className="status-badge processing">🔄 Processing...</span>;
        } else {
            return <span className="status-badge pending">🕐 Pending HR Response</span>;
        }
    };

    const getProgressSteps = () => {
        const steps = [
            { label: 'Email Sent', completed: true },
            { label: 'HR Responded', completed: status.hrResponded },
            { label: 'Data Compared', completed: status.status !== 'PENDING' },
            { label: 'Completed', completed: status.status?.includes('VERIFIED') }
        ];
        return steps;
    };

    return (
        <div className="verification-status">
            <div className="status-header">
                <h3>Verification Status</h3>
                {getStatusBadge()}
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
                {getProgressSteps().map((step, index) => (
                    <div key={index} className={`progress-step ${step.completed ? 'completed' : ''}`}>
                        <div className="step-indicator">
                            {step.completed ? '✓' : index + 1}
                        </div>
                        <div className="step-label">{step.label}</div>
                        {index < 3 && <div className="step-connector"></div>}
                    </div>
                ))}
            </div>

            {/* Status Details */}
            <div className="status-details">
                <div className="detail-row">
                    <span className="detail-label">Request ID:</span>
                    <span className="detail-value">{status.id}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{status.status}</span>
                </div>
                {status.riskScore !== undefined && (
                    <div className="detail-row">
                        <span className="detail-label">Risk Score:</span>
                        <span className="detail-value risk-score">{status.riskScore}/100</span>
                    </div>
                )}
                <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{new Date(status.createdAt).toLocaleString()}</span>
                </div>
            </div>

            {/* Actions */}
            {status.hrResponded && status.status === 'PENDING' && (
                <div className="status-actions">
                    <button onClick={handleManualFetch} className="btn-fetch" disabled={loading}>
                        {loading ? 'Processing...' : '🔄 Fetch & Compare Now'}
                    </button>
                    <p className="action-hint">HR has filled the form. Click to process immediately.</p>
                </div>
            )}

            {!status.hrResponded && (
                <div className="status-info">
                    <p>⏳ Waiting for HR to fill the verification form...</p>
                    <p className="info-hint">The system will automatically fetch and compare data once HR responds.</p>
                </div>
            )}
        </div>
    );
};

export default VerificationStatus;
