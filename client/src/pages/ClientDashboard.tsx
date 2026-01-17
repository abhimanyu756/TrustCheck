import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Client {
    clientId: string;
    companyName: string;
    contactPerson: string;
    email: string;
    totalEmployees: number;
    status: string;
    createdAt: string;
}

const ClientDashboard = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/clients');
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading clients...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Client Management</h1>
                        <p className="text-slate-600 mt-2">Manage client companies and employee verifications</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            to="/"
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                        >
                            ← Back to Home
                        </Link>
                        <Link
                            to="/clients/add"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            + Add New Client
                        </Link>
                    </div>
                </div>

                {/* Clients Grid */}
                {clients.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🏢</span>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Clients Yet</h3>
                        <p className="text-slate-600 mb-6">Get started by adding your first client company</p>
                        <Link
                            to="/clients/add"
                            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Add First Client
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clients.map((client) => (
                            <Link
                                key={client.clientId}
                                to={`/clients/${client.clientId}/cases`}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl">🏢</span>
                                    </div>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                        {client.status}
                                    </span>
                                </div>

                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{client.companyName}</h3>
                                <p className="text-sm text-slate-600 mb-4">Contact: {client.contactPerson}</p>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">
                                        {client.totalEmployees} employee{client.totalEmployees !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-blue-600 font-medium">View Cases →</span>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
                                    Added {new Date(client.createdAt).toLocaleDateString()}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientDashboard;
