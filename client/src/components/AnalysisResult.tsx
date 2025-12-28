import React from 'react';

interface ExtractedData {
    employeeName: string;
    companyName: string;
    dates: string;
    salary: string;
    [key: string]: string;
}

interface AuthenticityCheck {
    isSuspicious: boolean;
    reason: string;
}

interface AnalysisResultProps {
    data: {
        documentType: string;
        extractedData: ExtractedData;
        authenticityCheck: AuthenticityCheck;
    } | null;
    onReset: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ data, onReset }) => {
    if (!data) return null;

    const isHighRisk = data.authenticityCheck.isSuspicious;

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
