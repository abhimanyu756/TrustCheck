import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
    breadcrumbs?: { label: string; path: string }[];
}

const Navbar: React.FC<NavbarProps> = ({ breadcrumbs }) => {
    const location = useLocation();

    return (
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex justify-between items-center">
                    {/* Logo - Always links to home */}
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">T</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">TrustCheck AI</h1>
                            <p className="text-xs text-slate-500">Enterprise Background Verification</p>
                        </div>
                    </Link>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3">
                        <Link
                            to="/verifier"
                            className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${location.pathname.startsWith('/verifier')
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                }`}
                        >
                            <span>✓</span> Verify Checks
                        </Link>
                        <Link
                            to="/uploader"
                            className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${location.pathname.startsWith('/uploader')
                                ? 'bg-green-600 text-white'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                        >
                            <span>📁</span> Upload Documents
                        </Link>
                        <Link
                            to="/clients"
                            className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${location.pathname.startsWith('/clients') || location.pathname.startsWith('/cases')
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                        >
                            <span>🏢</span> Client Management
                        </Link>
                        <Link
                            to="/status"
                            className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${location.pathname === '/status'
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            <span>📊</span> Dashboard
                        </Link>
                        <Link
                            to="/emails"
                            className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${location.pathname.startsWith('/emails')
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                }`}
                        >
                            <span>📧</span> Email Inbox
                        </Link>
                    </div>
                </div>

                {/* Breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
                            Home
                        </Link>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={index}>
                                <span className="text-slate-400">/</span>
                                {index === breadcrumbs.length - 1 ? (
                                    <span className="text-slate-600 font-medium">{crumb.label}</span>
                                ) : (
                                    <Link to={crumb.path} className="text-blue-600 hover:text-blue-800 font-medium">
                                        {crumb.label}
                                    </Link>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;
