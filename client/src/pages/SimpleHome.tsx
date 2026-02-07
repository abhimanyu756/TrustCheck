import { Link } from 'react-router-dom';

const SimpleHome = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">T</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">TrustCheck AI</h1>
                                <p className="text-xs text-slate-500">Enterprise Background Verification</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                to="/verifier"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                            >
                                <span>✓</span> Verify Checks
                            </Link>
                            <Link
                                to="/uploader"
                                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm flex items-center gap-2"
                            >
                                <span>📁</span> Upload Documents
                            </Link>
                            <Link
                                to="/clients"
                                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm flex items-center gap-2"
                            >
                                <span>🏢</span> Client Management
                            </Link>
                            <Link
                                to="/status"
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm flex items-center gap-2"
                            >
                                <span>📊</span> Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h2 className="text-5xl font-bold text-slate-900 mb-4">
                        Automated Background Verification
                    </h2>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                        AI-powered verification system for comprehensive employee background checks.
                        Manage clients, upload documents, and track verification status all in one place.
                    </p>
                </div>

                {/* Quick Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mt-16">
                    <Link to="/zones/green" className="bg-white rounded-2xl p-10 border-2 border-slate-200 hover:border-blue-500 hover:shadow-2xl transition-all group">
                        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-4xl text-white">✓</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-3 text-xl">Green Zone</h3>
                        <p className="text-slate-600">Auto-approved verifications with low risk scores</p>
                    </Link>

                    <Link to="/zones/red" className="bg-white rounded-2xl p-10 border-2 border-slate-200 hover:border-slate-800 hover:shadow-2xl transition-all group">
                        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-4xl text-white">⚠</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-3 text-xl">Red Zone</h3>
                        <p className="text-slate-600">Checks requiring manual supervisor review</p>
                    </Link>

                    <Link to="/status" className="bg-white rounded-2xl p-10 border-2 border-slate-200 hover:border-blue-500 hover:shadow-2xl transition-all group">
                        <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-4xl text-white">📊</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-3 text-xl">View Dashboard</h3>
                        <p className="text-slate-600">Monitor all verification checks and risk zones in real-time</p>
                    </Link>

                    <Link to="/clients" className="bg-white rounded-2xl p-10 border-2 border-slate-200 hover:border-blue-500 hover:shadow-2xl transition-all group">
                        <div className="w-20 h-20 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-4xl text-white">🏢</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-3 text-xl">Manage Clients</h3>
                        <p className="text-slate-600">Add clients and configure verification settings and SKUs</p>
                    </Link>
                </div>

                {/* Features Section */}
                <div className="mt-24 max-w-6xl mx-auto">
                    <h3 className="text-3xl font-bold text-center text-slate-900 mb-12">Platform Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                            <div className="text-3xl mb-3">🤖</div>
                            <h4 className="font-semibold text-slate-900 mb-2">AI-Powered Analysis</h4>
                            <p className="text-sm text-slate-600">Automated document verification and fraud detection</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                            <div className="text-3xl mb-3">📧</div>
                            <h4 className="font-semibold text-slate-900 mb-2">HR Outreach</h4>
                            <p className="text-sm text-slate-600">Automated email verification with previous employers</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                            <div className="text-3xl mb-3">🎯</div>
                            <h4 className="font-semibold text-slate-900 mb-2">Risk Assessment</h4>
                            <p className="text-sm text-slate-600">Real-time risk scoring and zone classification</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                            <div className="text-3xl mb-3">📈</div>
                            <h4 className="font-semibold text-slate-900 mb-2">Activity Tracking</h4>
                            <p className="text-sm text-slate-600">Complete audit trail of all verification steps</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 border-t border-slate-800 mt-24">
                <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
                    <p>© 2026 TrustCheck AI • Powered by Gemini 2.0 • Enterprise Background Verification Platform</p>
                </div>
            </footer>
        </div>
    );
};

export default SimpleHome;
