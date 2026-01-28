import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
import Breadcrumb from '../components/Breadcrumb';

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

interface FormErrors {
    companyName?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    totalEmployees?: string;
    skuName?: string;
}

// Validation helper functions
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneDigits = phone.replace(/\D/g, '');
    return phoneDigits.length >= 10;
};

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

    const [errors, setErrors] = useState<FormErrors>({});

    // Validate a single field
    const validateField = (name: string, value: string | number): string | undefined => {
        switch (name) {
            case 'companyName':
                if (!String(value).trim()) return 'Company name is required';
                if (String(value).trim().length < 2) return 'Company name must be at least 2 characters';
                return undefined;
            case 'contactPerson':
                if (!String(value).trim()) return 'Contact person is required';
                if (String(value).trim().length < 2) return 'Contact person must be at least 2 characters';
                return undefined;
            case 'email':
                if (!String(value).trim()) return 'Email is required';
                if (!isValidEmail(String(value))) return 'Please enter a valid email address';
                return undefined;
            case 'phone':
                if (String(value) && !isValidPhone(String(value))) return 'Please enter a valid phone number (10+ digits)';
                return undefined;
            case 'totalEmployees':
                if (!value || Number(value) < 1) return 'At least 1 employee is required';
                return undefined;
            case 'skuName':
                if (!String(value).trim()) return 'SKU name is required';
                return undefined;
            default:
                return undefined;
        }
    };

    // Validate entire form
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        newErrors.companyName = validateField('companyName', formData.companyName);
        newErrors.contactPerson = validateField('contactPerson', formData.contactPerson);
        newErrors.email = validateField('email', formData.email);
        newErrors.phone = validateField('phone', formData.phone);
        newErrors.totalEmployees = validateField('totalEmployees', formData.totalEmployees);
        newErrors.skuName = validateField('skuName', formData.skuName);

        // Check if any errors exist
        Object.values(newErrors).forEach(error => {
            if (error) isValid = false;
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'totalEmployees' ? parseInt(value) || 0 : value
        }));

        // Clear error on change
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const error = validateField(name, name === 'totalEmployees' ? parseInt(value) || 0 : value);
        setErrors(prev => ({
            ...prev,
            [name]: error
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

        // Validate form before submission
        if (!validateForm()) {
            return;
        }

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

    // Helper to get input class based on error state
    const getInputClass = (hasError: boolean) => {
        const base = 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent';
        return hasError
            ? `${base} border-red-500 focus:ring-red-500`
            : `${base} border-slate-300 focus:ring-blue-500`;
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Logo />
                    <div className="mt-6">
                        <Breadcrumb items={[
                            { label: 'Home', path: '/' },
                            { label: 'Client Management', path: '/clients' },
                            { label: 'Add New Client' }
                        ]} />
                        <h1 className="text-3xl font-bold text-slate-800">Add New Client</h1>
                        <p className="text-slate-600 mt-2">Configure client details and verification preferences (SKU)</p>
                    </div>
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
                                        onBlur={handleBlur}
                                        className={getInputClass(!!errors.companyName)}
                                        placeholder="Acme Corporation"
                                    />
                                    {errors.companyName && (
                                        <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>
                                    )}
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
                                            onBlur={handleBlur}
                                            className={getInputClass(!!errors.contactPerson)}
                                            placeholder="John Doe"
                                        />
                                        {errors.contactPerson && (
                                            <p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>
                                        )}
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
                                            onBlur={handleBlur}
                                            className={getInputClass(!!errors.email)}
                                            placeholder="john.doe@acme.com"
                                        />
                                        {errors.email && (
                                            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                                        )}
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
                                            onBlur={handleBlur}
                                            className={getInputClass(!!errors.phone)}
                                            placeholder="+91-9876543210"
                                        />
                                        {errors.phone && (
                                            <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                                        )}
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
                                            onBlur={handleBlur}
                                            min="1"
                                            className={getInputClass(!!errors.totalEmployees)}
                                            placeholder="5"
                                        />
                                        {errors.totalEmployees && (
                                            <p className="text-red-500 text-xs mt-1">{errors.totalEmployees}</p>
                                        )}
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
                                        onBlur={handleBlur}
                                        className={getInputClass(!!errors.skuName)}
                                        placeholder="e.g., Standard Employment Verification"
                                    />
                                    {errors.skuName && (
                                        <p className="text-red-500 text-xs mt-1">{errors.skuName}</p>
                                    )}
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
