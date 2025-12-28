import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FileUpload } from './components/FileUpload';
import { AnalysisResult } from './components/AnalysisResult';
import { VerificationChat } from './pages/VerificationChat';

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
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">Trust Check AI</h1>
          <p className="mt-4 text-lg text-slate-600">Autonomous Background Verification Agent powered by Gemini 3</p>
        </div>

        <div className="bg-white/50 backdrop-blur-sm shadow-xl rounded-2xl p-6 md:p-10 border border-white">
          {!result ? (
            <>
              <div className="mb-8 text-center max-w-lg mx-auto">
                <p className="text-slate-500">Upload a <strong>Offer Letter</strong> or <strong>Payslip</strong>. Our agent will verify it.</p>
              </div>
              <FileUpload onUpload={handleUpload} isLoading={loading} />
              {error && <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-center text-sm">{error}</div>}
            </>
          ) : (
            <AnalysisResult data={result} onReset={() => setResult(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/verify/:id" element={<VerificationChat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
