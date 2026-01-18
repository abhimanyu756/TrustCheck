import React from 'react';
import { Link } from 'react-router-dom';

const Logo = () => {
    return (
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-800">TrustCheck AI</h1>
                <p className="text-xs text-slate-500">Enterprise Background Verification</p>
            </div>
        </Link>
    );
};

export default Logo;
