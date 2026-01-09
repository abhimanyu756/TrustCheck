import React, { useState } from 'react';

interface ExtractedData {
    employeeName: string;
    companyName: string;
    dates: string;
    salary: string;
    designation?: string;
    [key: string]: string | undefined;
}

interface AuthenticityCheck {
    isSuspicious: boolean;
    reason: string;
    visualAnomalies?: string[];
}

interface MetadataForensics {
    metadata: any;
    analysis: {
        isSuspicious: boolean;
        suspicionLevel: string;
        findings: Array<{
            issue: string;
            severity: string;
            explanation: string;
        }>;
        recommendation: string;
    };
}

interface AnalysisResultProps {
    data: {
        documentType: string;
        extractedData: ExtractedData;
        authenticityCheck: AuthenticityCheck;
        metadataForensics?: MetadataForensics;
    } | null;
    onReset: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ data, onReset }) => {
    const [showMetadata, setShowMetadata] = useState(false);

    if (!data) return null;

    const isHighRisk = data.authenticityCheck.isSuspicious;
    const hasMetadataIssues = data.metadataForensics?.analysis?.isSuspicious;

    return (
        <div className="w-full max-w-2xl mx-auto mt-8 animate-fade-in">
            {/* Header Card */}
            <div className={`p-6 rounded-t-xl border-l-4 ${isHighRisk ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'} shadow-sm`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className={`text-xl font-bold ${isHighRisk ? 'text-red-700' : 'text-green-700'}`}>
                            {isHighRisk ? '⚠️ Tampering Detected' : '✅ Document Verified'}
                        </h2>
                        <p className="text-sm mt-1 text-slate-600 font-medium">Type: {data.documentType}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isHighRisk ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                        {isHighRisk ? 'High Risk' : 'Low Risk'}
                    </span>
                </div>
                {isHighRisk && (
                    <div className="mt-3 p-3 bg-white/80 rounded-lg text-sm text-red-600 border border-red-200">
                        <strong>Analysis:</strong> {data.authenticityCheck.reason}
                    </div>
                )}

                {/* Visual Anomalies */}
                {data.authenticityCheck.visualAnomalies && data.authenticityCheck.visualAnomalies.length > 0 && (
                    <div className="mt-3 p-3 bg-orange-50 rounded-lg text-sm border border-orange-200">
                        <strong className="text-orange-800">Visual Anomalies Detected:</strong>
                        <ul className="mt-1 ml-4 list-disc text-orange-700">
                            {data.authenticityCheck.visualAnomalies.map((anomaly, idx) => (
                                <li key={idx}>{anomaly}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Metadata Forensics Section */}
                {data.metadataForensics && (
                    <div className="mt-4">
                        <button
                            onClick={() => setShowMetadata(!showMetadata)}
                            className="w-full flex justify-between items-center p-3 bg-white/60 rounded-lg border border-current/20 hover:bg-white/80 transition-colors"
                        >
                            <span className="font-bold text-sm">🔍 PDF Metadata Forensics</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${hasMetadataIssues ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                                {data.metadataForensics.analysis.suspicionLevel}
                            </span>
                        </button>

                        {showMetadata && (
                            <div className="mt-2 p-4 bg-white/80 rounded-lg border border-current/20 space-y-2">
                                <div className="text-xs">
                                    <strong>Creator:</strong> {data.metadataForensics.metadata.info?.Creator || 'Unknown'}
                                </div>
                                <div className="text-xs">
                                    <strong>Producer:</strong> {data.metadataForensics.metadata.info?.Producer || 'Unknown'}
                                </div>

                                {data.metadataForensics.analysis.findings.length > 0 && (
                                    <div className="mt-3">
                                        <div className="text-xs font-bold text-red-700 mb-1">Forensic Findings:</div>
                                        {data.metadataForensics.analysis.findings.map((finding, idx) => (
                                            <div key={idx} className="text-xs bg-red-50 p-2 rounded border border-red-200 mb-1">
                                                <div className="flex justify-between">
                                                    <strong>{finding.issue}</strong>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${finding.severity === 'HIGH' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                                        {finding.severity}
                                                    </span>
                                                </div>
                                                <div className="mt-1 opacity-75">{finding.explanation}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-2 text-xs italic opacity-75">
                                    {data.metadataForensics.analysis.recommendation}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Details Grid */}
            <div className="bg-white p-6 rounded-b-xl shadow-lg border border-t-0 border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Extracted Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(data.extractedData).map(([key, value]) => (
                        <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-400 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="font-semibold text-slate-800 truncate" title={value}>{value || '-'}</p>
                        </div>
                    ))}
                </div>

                {/* Verification Action */}
                <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg mt-6 hidden sm:block">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-slate-400">Step 2: HR Verification</h3>
                    <p className="text-sm text-slate-300 mb-4">
                        Initiate the autonomous agent to contact the previous employer.
                    </p>

                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="Enter HR Email (e.g. hr@company.com)"
                            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="hrEmailInput"
                        />
                        <button
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors"
                            onClick={async () => {
                                const email = (document.getElementById('hrEmailInput') as HTMLInputElement).value;
                                if (!email) return alert("Please enter HR Email");

                                const btn = document.activeElement as HTMLButtonElement;
                                const originalText = btn.innerText;
                                btn.innerText = "Sending...";

                                try {
                                    const res = await fetch('http://localhost:3000/api/verify/initiate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            candidateData: data.extractedData,
                                            hrEmail: email
                                        })
                                    });
                                    if (!res.ok) throw new Error('API Error');

                                    btn.innerText = "Sent!";
                                    alert("Verification Email Sent! (Check your backend terminal for the link/logs)");
                                    setTimeout(() => btn.innerText = originalText, 2000);
                                } catch (e) {
                                    console.error(e);
                                    btn.innerText = "Error";
                                    alert("Failed to send email. Check backend console.");
                                }
                            }}
                        >
                            Start Agent
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <button
                        onClick={onReset}
                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                    >
                        Scan Another Document
                    </button>
                </div>
            </div>
        </div>
    );
};
