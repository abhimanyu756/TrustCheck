import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { FileUpload } from './components/FileUpload';
import { AnalysisResult } from './components/AnalysisResult';
import { VerificationChat } from './pages/VerificationChat';
import { Dashboard } from './pages/Dashboard';
import VerificationDetails from './pages/VerificationDetails';
import ClientDashboard from './pages/ClientDashboard';
import AddClient from './pages/AddClient';
import AddEmployees from './pages/AddEmployees';
import ClientCases from './pages/ClientCases';
import CaseDetails from './pages/CaseDetails';
import UploaderDashboard from './pages/UploaderDashboard';
import VerifierDashboard from './pages/VerifierDashboard';
import CheckStatusPage from './pages/CheckStatusPage';
import StatusDashboard from './pages/StatusDashboard';
import SimpleHome from './pages/SimpleHome';
import EmailInbox from './pages/EmailInbox';
import EmailThreadView from './pages/EmailThreadView';
import GreenZoneDashboard from './pages/GreenZoneDashboard';
import RedZoneDashboard from './pages/RedZoneDashboard';
import ComparisonDetailsView from './pages/ComparisonDetailsView';
import { ToastProvider } from './contexts/ToastContext';
import ExtractedDataView from './pages/ExtractedDataView';

// Types
interface AnalysisResponse {
  documentType: string;
  extractedData: any;
  authenticityCheck: { isSuspicious: boolean; reason: string; };
}

function Home() {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('http://localhost:3000/api/documents/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed.');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze document. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">TrustCheck AI</h1>
              <p className="text-xs text-slate-500">Enterprise Background Verification</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/verifier"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <span>✓</span> Verify Checks
            </Link>
            <Link
              to="/uploader"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <span>📁</span> Upload Documents
            </Link>
            <Link
              to="/clients"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
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
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        {!result && (
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              Automated Background Verification
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Upload employment documents for AI-powered verification. Our system analyzes authenticity,
              extracts data, and contacts previous employers automatically.
            </p>
          </div>
        )}

        {!result ? (
          <>
            {/* Document Categories */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-800 mb-6 text-center">
                Select Document Type to Upload
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Offer Letter */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📄</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Offer Letter</h4>
                  <p className="text-sm text-slate-600">Employment offer documents</p>
                </div>

                {/* Salary Slip */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-green-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Salary Slip</h4>
                  <p className="text-sm text-slate-600">Monthly payslip documents</p>
                </div>

                {/* Form 16 */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📋</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Form 16</h4>
                  <p className="text-sm text-slate-600">Tax deduction certificates</p>
                </div>

                {/* Relieving Letter */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-orange-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Relieving Letter</h4>
                  <p className="text-sm text-slate-600">Employment exit documents</p>
                </div>

                {/* EPFO */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">🏛️</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">EPFO Statement</h4>
                  <p className="text-sm text-slate-600">Provident fund records</p>
                </div>

                {/* Experience Letter */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-teal-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📜</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Experience Letter</h4>
                  <p className="text-sm text-slate-600">Work experience certificates</p>
                </div>

                {/* Appointment Letter */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-pink-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Appointment Letter</h4>
                  <p className="text-sm text-slate-600">Job appointment documents</p>
                </div>

                {/* Other Documents */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-slate-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-2xl">📁</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Other Documents</h4>
                  <p className="text-sm text-slate-600">Additional employment docs</p>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload Document</h3>
                <p className="text-slate-600">
                  Supported formats: PDF, JPG, PNG • Max size: 10MB
                </p>
              </div>

              <FileUpload onUpload={handleUpload} isLoading={loading} />

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Features */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600">🔍</span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-800 mb-1">AI Analysis</h4>
                  <p className="text-xs text-slate-600">Gemini-powered verification</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-600">⚡</span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-800 mb-1">Instant Results</h4>
                  <p className="text-xs text-slate-600">Real-time processing</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-600">🔒</span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-800 mb-1">Secure</h4>
                  <p className="text-xs text-slate-600">Enterprise-grade security</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <AnalysisResult data={result} onReset={() => setResult(null)} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-600">
          <p>© 2026 TrustCheck AI • Powered by Gemini 2.0 • Enterprise Background Verification Platform</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SimpleHome />} />
          <Route path="/status" element={<StatusDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/verify/:id" element={<VerificationChat />} />
          <Route path="/verify/:id/details" element={<VerificationDetails />} />
          <Route path="/clients" element={<ClientDashboard />} />
          <Route path="/clients/add" element={<AddClient />} />
          <Route path="/clients/:clientId/employees/add" element={<AddEmployees />} />
          <Route path="/clients/:clientId/cases" element={<ClientCases />} />
          <Route path="/cases/:caseId" element={<CaseDetails />} />
          <Route path="/uploader" element={<UploaderDashboard />} />
          <Route path="/verifier" element={<VerifierDashboard />} />
          <Route path="/check-status/:checkId" element={<CheckStatusPage />} />
          <Route path="/emails" element={<EmailInbox />} />
          <Route path="/emails/:checkId" element={<EmailInbox />} />
          <Route path="/email-thread/:emailId" element={<EmailThreadView />} />
          <Route path="/zones/green" element={<GreenZoneDashboard />} />
          <Route path="/zones/red" element={<RedZoneDashboard />} />
          <Route path="/zones/comparison/:checkId" element={<ComparisonDetailsView />} />
          <Route path="/cases/:caseId/extracted-data" element={<ExtractedDataView />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;