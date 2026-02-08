import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

interface ExtractedData {
    employeeName: string | null;
    companyName: string | null;
    designation: string | null;
    employmentDates: string | null;
    salary: string | null;
    uanNumber: string | null;
    documentType: string | null;
    confidence: number | null;
    // Education fields
    studentName?: string;
    institution?: string;
    university?: string;
    degree?: string;
    yearOfPassing?: string;
    grade?: string;
    percentage?: string;
    enrollmentNumber?: string;
    // Generic fields
    name?: string;
    idNumber?: string;
    passportNumber?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    dateOfBirth?: string;
    dob?: string;
}

interface Document {
    documentId: string;
    documentType: string;
    fileName: string;
    extractedData: ExtractedData | null;
}

const ExtractedDataView = () => {
    const { caseId } = useParams<{ caseId: string }>();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (caseId) {
            fetchDocuments();
        }
    }, [caseId]);

    const fetchDocuments = async () => {
        try {
            const response = await axios.get(`/api/document-upload/case/${caseId}`);
            setDocuments(response.data.documents);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to categorize documents
    const getCategory = (docType: string) => {
        const type = (docType || '').toLowerCase();
        if (type.includes('marksheet') || type.includes('degree') || type.includes('education') || type.includes('transcript') || type.includes('diploma') || type.includes('12th') || type.includes('10th')) return 'EDUCATION';
        if (type.includes('salary') || type.includes('relieving') || type.includes('experience') || type.includes('appointment') || type.includes('offer') || type.includes('resignation')) return 'EMPLOYMENT';
        if (type.includes('police') || type.includes('criminal') || type.includes('court') || type.includes('pcc')) return 'CRIME';
        if (type.includes('aadhar') || type.includes('pan') || type.includes('passport') || type.includes('voter') || type.includes('driving')) return 'IDENTITY';
        return 'OTHER';
    };

    // Group documents
    const groupedDocs = {
        EDUCATION: documents.filter(d => getCategory(d.documentType) === 'EDUCATION'),
        EMPLOYMENT: documents.filter(d => getCategory(d.documentType) === 'EMPLOYMENT'),
        IDENTITY: documents.filter(d => ['IDENTITY', 'CRIME'].includes(getCategory(d.documentType))),
        OTHER: documents.filter(d => getCategory(d.documentType) === 'OTHER')
    };

    const hasAnyDocs = documents.length > 0;

    const renderEmploymentTable = (docs: Document[]) => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800">Employment Documents</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Document</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Designation</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dates</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Salary</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">UAN</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {docs.map((doc) => {
                            const data = doc.extractedData || {};
                            return (
                                <tr key={doc.documentId} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{doc.fileName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.documentType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{data.employeeName || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.companyName || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.designation || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.employmentDates || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.salary || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.uanNumber || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderEducationTable = (docs: Document[]) => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800">Education Documents</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Document</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Institution</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Degree/Course</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Year</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Grade/Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Enrollment No</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {docs.map((doc) => {
                            const data: any = doc.extractedData || {};
                            return (
                                <tr key={doc.documentId} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{doc.fileName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.documentType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{data.studentName || data.employeeName || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.institution || data.university || data.companyName || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.degree || data.designation || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.yearOfPassing || data.employmentDates || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.grade || data.percentage || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.enrollmentNumber || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderGenericTable = (docs: Document[], title: string) => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Document</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date/Year</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {docs.map((doc) => {
                            const data: any = doc.extractedData || {};
                            return (
                                <tr key={doc.documentId} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{doc.fileName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.documentType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{data.employeeName || data.name || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {data.idNumber || data.passportNumber || data.panNumber || data.aadhaarNumber || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{data.dateOfBirth || data.dob || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Extracted Document Data</h1>
                        <p className="text-slate-600">Data automatically extracted from uploaded documents for Case ID: {caseId}</p>
                    </div>
                    <Link to="/verifier" className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors">
                        Back to Verifier Dashboard
                    </Link>
                </div>

                {!hasAnyDocs ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                        No documents found for this case.
                    </div>
                ) : (
                    <>
                        {groupedDocs.EDUCATION.length > 0 && renderEducationTable(groupedDocs.EDUCATION)}
                        {groupedDocs.EMPLOYMENT.length > 0 && renderEmploymentTable(groupedDocs.EMPLOYMENT)}
                        {groupedDocs.IDENTITY.length > 0 && renderGenericTable(groupedDocs.IDENTITY, 'Identity & Criminal Background Documents')}
                        {groupedDocs.OTHER.length > 0 && renderGenericTable(groupedDocs.OTHER, 'Other Documents')}
                    </>
                )}
            </div>
        </div>
    );
};

export default ExtractedDataView;
