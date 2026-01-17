import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SPECIAL_INSTRUCTIONS = [
    { id: 'uan_30day_tolerance', label: 'UAN: 30-day tenure difference tolerance (tag as Green)' },
    { id: 'uan_dol_pf_check', label: 'UAN: If DOL unavailable, check last 3 months PF deductions' },
    { id: 'no_overseas_checks', label: 'No overseas checks - Escalate to CSE' },
    { id: 'utv_before_due', label: 'Close UTV checks before due date' },
    { id: 'no_verbal_closures', label: 'Verbal closures not acceptable' },
    { id: 'require_experience_letter', label: 'Do not initiate without experience letter' },
    { id: 'govt_org_escalate', label: 'Government organizations - Escalate to CSE' },
    { id: 'mandatory_5_followups', label: '5 follow-ups mandatory to close as UTV' },
    { id: 'hr_attempts_required', label: 'HR attempts required before UAN verification' },
    { id: 'company_not_found_escalate', label: 'Company not in UAN database - Escalate within 2-3 days' },
    { id: 'insufficiency_no_exp_letter', label: 'Raise insufficiency if no experience letter' },
    { id: 'red_checks_escalate', label: 'All RED checks (negative response) escalate to CSE' }
];

const AddClient = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        totalEmployees: 0,
        // SKU Configuration
        skuName: '',
        primaryVerificationMethod: 'hr_rm_verification',
        fallbackMethod: 'uan_verification',
        verificationType: 'written',
        specialInstructions: [] as string[]
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'totalEmployees' ? parseInt(value) || 0 : value
        }));
    };

    const handleInstructionToggle = (instructionId: string) => {
        setFormData(prev => ({
            ...prev,
            specialInstructions: prev.specialInstructions.includes(instructionId)
                ? prev.specialInstructions.filter(id => id !== instructionId)
                : [...prev.specialInstructions, instructionId]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:3000/api/clients', formData);
            const clientId = response.data.clientId;

            // Redirect to add employees page
            navigate(`/clients/${clientId}/employees/add`);
        } catch (error) {
            console.error('Error creating client:', error);
            alert('Failed to create client. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Add New Client</h1>
                    <p className="text-slate-600 mt-2">Configure client details and verification preferences (SKU)</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <form onSubmit={handleSubmit}>
                        {/* Basic Information */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-slate-800 mb-4">Basic Information</h2>
                            <div className="space-y-6">
                                {/* Company Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Acme Corporation"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Contact Person */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Contact Person *
                                        </label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            value={formData.contactPerson}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="john.doe@acme.com"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="+91-9876543210"
                                        />
                                    </div>

                                    {/* Total Employees */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Number of Employees to Verify *
                                        </label>
                                        <input
                                            type="number"
                                            name="totalEmployees"
                                            value={formData.totalEmployees}
                                            onChange={handleChange}
                                            required
                                            min="1"
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="5"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Address
                                    </label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows={2}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="123 Business Park, Mumbai"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SKU Configuration */}
                        <div className="mb-8 border-t border-slate-200 pt-8">
                            <h2 className="text-xl font-semibold text-slate-800 mb-4">SKU Configuration</h2>
                            <div className="space-y-6">
                                {/* SKU Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        SKU Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="skuName"
                                        value={formData.skuName}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., Standard Employment Verification"
                                    />
                                </div>

                                {/* Primary Verification Method */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Primary Verification Method *
                                    </label>
                                    <select
                                        name="primaryVerificationMethod"
                                        value={formData.primaryVerificationMethod}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="hr_rm_verification">HR/RM Verification (Email/Call)</option>
                                        <option value="uan_verification">UAN Verification</option>
                                        <option value="form16_verification">Form 16 Verification</option>
                                    </select>
                                </div>

                                {/* Fallback Method */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Fallback Method (if primary fails) *
                                    </label>
                                    <select
                                        name="fallbackMethod"
                                        value={formData.fallbackMethod}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="uan_verification">UAN Verification</option>
                                        <option value="form16_verification">Form 16 Verification</option>
                                        <option value="escalate">Escalate to CSE</option>
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Used when HR/RM is not responding to emails/calls
                                    </p>
                                </div>

                                {/* Verification Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Verification Type (for HR/RM) *
                                    </label>
                                    <select
                                        name="verificationType"
                                        value={formData.verificationType}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="written">Written Verification</option>
                                        <option value="verbal">Verbal Verification</option>
                                        <option value="both">Both (Written Preferred)</option>
                                    </select>
                                </div>

                                {/* Special Instructions */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">
                                        Special Instructions for AI Agent
                                    </label>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                                        {SPECIAL_INSTRUCTIONS.map((instruction) => (
                                            <label
                                                key={instruction.id}
                                                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.specialInstructions.includes(instruction.id)}
                                                    onChange={() => handleInstructionToggle(instruction.id)}
                                                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-700 flex-1">{instruction.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Selected: {formData.specialInstructions.length} instruction(s)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/clients')}
                                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Continue to Add Employees'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddClient;
