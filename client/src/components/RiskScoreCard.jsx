import React from 'react';
import './RiskScoreCard.css';

const RiskScoreCard = ({ verification }) => {
    if (!verification) return null;

    const { riskScore = 0, zone = 'PENDING', comparisonResult = {} } = verification;
    const { discrepancies = [], matches = [], matchRate = 0 } = comparisonResult;

    // Determine color based on zone
    const getZoneColor = () => {
        switch (zone) {
            case 'GREEN':
            case 'VERIFIED_GREEN':
                return '#10b981'; // green
            case 'YELLOW':
            case 'VERIFIED_YELLOW':
                return '#f59e0b'; // yellow
            case 'RED':
            case 'VERIFIED_RED':
                return '#ef4444'; // red
            default:
                return '#6b7280'; // gray
        }
    };

    const getZoneLabel = () => {
        if (zone.includes('GREEN')) return 'Green Zone';
        if (zone.includes('YELLOW')) return 'Yellow Zone';
        if (zone.includes('RED')) return 'Red Zone';
        return 'Pending';
    };

    const getZoneIcon = () => {
        if (zone.includes('GREEN')) return '✅';
        if (zone.includes('YELLOW')) return '⚠️';
        if (zone.includes('RED')) return '🚨';
        return '🕐';
    };

    // Calculate circle progress
    const circumference = 2 * Math.PI * 45;
    const progress = circumference - (riskScore / 100) * circumference;

    return (
        <div className="risk-score-card">
            <div className="risk-score-header">
                <h3>Risk Assessment</h3>
            </div>

            <div className="risk-score-body">
                {/* Circular Progress */}
                <div className="risk-circle-container">
                    <svg className="risk-circle" width="120" height="120">
                        <circle
                            cx="60"
                            cy="60"
                            r="45"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="10"
                        />
                        <circle
                            cx="60"
                            cy="60"
                            r="45"
                            fill="none"
                            stroke={getZoneColor()}
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={progress}
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                        />
                    </svg>
                    <div className="risk-score-value">
                        <span className="score-number">{riskScore}</span>
                        <span className="score-label">/100</span>
                    </div>
                </div>

                {/* Zone Badge */}
                <div className="zone-badge" style={{ backgroundColor: getZoneColor() }}>
                    <span className="zone-icon">{getZoneIcon()}</span>
                    <span className="zone-label">{getZoneLabel()}</span>
                </div>

                {/* Stats */}
                <div className="risk-stats">
                    <div className="stat-item">
                        <span className="stat-label">Match Rate</span>
                        <span className="stat-value">{matchRate}%</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Discrepancies</span>
                        <span className="stat-value">{discrepancies.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Matches</span>
                        <span className="stat-value">{matches.length}</span>
                    </div>
                </div>

                {/* Discrepancies List */}
                {discrepancies.length > 0 && (
                    <div className="discrepancies-section">
                        <h4>⚠️ Discrepancies Found</h4>
                        <div className="discrepancies-list">
                            {discrepancies.map((disc, index) => (
                                <div key={index} className={`discrepancy-item severity-${disc.severity?.toLowerCase()}`}>
                                    <div className="disc-field">{disc.field}</div>
                                    <div className="disc-details">
                                        {disc.candidate && (
                                            <div className="disc-row">
                                                <span className="disc-label">Claimed:</span>
                                                <span className="disc-value">{disc.candidate}</span>
                                            </div>
                                        )}
                                        {disc.hr && (
                                            <div className="disc-row">
                                                <span className="disc-label">Verified:</span>
                                                <span className="disc-value">{disc.hr}</span>
                                            </div>
                                        )}
                                        {disc.difference && (
                                            <div className="disc-diff">Difference: {disc.difference}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Matches List */}
                {matches.length > 0 && (
                    <div className="matches-section">
                        <h4>✅ Verified Fields</h4>
                        <div className="matches-list">
                            {matches.map((match, index) => (
                                <div key={index} className="match-item">
                                    <span className="match-icon">✓</span>
                                    <span className="match-field">{match.field}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                {comparisonResult.summary && (
                    <div className="risk-summary">
                        <p>{comparisonResult.summary}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RiskScoreCard;
