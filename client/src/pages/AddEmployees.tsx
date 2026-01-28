import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
import Breadcrumb from '../components/Breadcrumb';

interface PreviousEmployment {
    companyName: string;
    hrEmail: string;
    employmentDates: string;
    designation: string;
    uanNumber: string;
}

interface Employee {
    employeeName: string;
    employeeEmail: string;
    employeePhone: string;
    dateOfBirth: string;
    positionApplied: string;
    previousEmployments: PreviousEmployment[];
}

interface EmploymentErrors {
    companyName?: string;
    hrEmail?: string;
    employmentDates?: string;
    designation?: string;
}

interface EmployeeErrors {
    employeeName?: string;
    employeeEmail?: string;
    employeePhone?: string;
    dateOfBirth?: string;
    positionApplied?: string;
    employments: EmploymentErrors[];
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

const isValidDate = (date: string): boolean => {
    if (!date) return true; // Optional field
    const inputDate = new Date(date);
    const today = new Date();
    return inputDate <= today;
};

const AddEmployees = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([{
        employeeName: '',
        employeeEmail: '',
        employeePhone: '',
        dateOfBirth: '',
        positionApplied: '',
        previousEmployments: [{
            companyName: '',
            hrEmail: '',
            employmentDates: '',
            designation: '',
            uanNumber: ''
        }]
    }]);

    const [errors, setErrors] = useState<EmployeeErrors[]>([{
        employments: [{}]
    }]);

    // Initialize errors for new employee
    const createEmptyEmployeeErrors = (): EmployeeErrors => ({
        employments: [{}]
    });

    // Validate a single employee field
    const validateEmployeeField = (field: keyof Employee, value: string): string | undefined => {
        switch (field) {
            case 'employeeName':
                if (!value.trim()) return 'Name is required';
                if (value.trim().length < 2) return 'Name must be at least 2 characters';
                return undefined;
            case 'employeeEmail':
                if (!value.trim()) return 'Email is required';
                if (!isValidEmail(value)) return 'Please enter a valid email address';
                return undefined;
            case 'employeePhone':
                if (value && !isValidPhone(value)) return 'Please enter a valid phone number (10+ digits)';
                return undefined;
            case 'dateOfBirth':
                if (value && !isValidDate(value)) return 'Date of birth cannot be in the future';
                return undefined;
            case 'positionApplied':
                if (!value.trim()) return 'Position is required';
                if (value.trim().length < 2) return 'Position must be at least 2 characters';
                return undefined;
            default:
                return undefined;
        }
    };

    // Validate a single employment field
    const validateEmploymentField = (field: keyof PreviousEmployment, value: string): string | undefined => {
        switch (field) {
            case 'companyName':
                if (!value.trim()) return 'Company name is required';
                return undefined;
            case 'hrEmail':
                if (!value.trim()) return 'HR email is required';
                if (!isValidEmail(value)) return 'Please enter a valid HR email';
                return undefined;
            case 'employmentDates':
                if (!value.trim()) return 'Employment dates are required';
                return undefined;
            case 'designation':
                if (!value.trim()) return 'Designation is required';
                return undefined;
            default:
                return undefined;
        }
    };

    // Validate entire form
    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: EmployeeErrors[] = employees.map((emp, empIndex) => {
            const empErrors: EmployeeErrors = { employments: [] };

            // Validate employee fields
            empErrors.employeeName = validateEmployeeField('employeeName', emp.employeeName);
            empErrors.employeeEmail = validateEmployeeField('employeeEmail', emp.employeeEmail);
            empErrors.employeePhone = validateEmployeeField('employeePhone', emp.employeePhone);
            empErrors.dateOfBirth = validateEmployeeField('dateOfBirth', emp.dateOfBirth);
            empErrors.positionApplied = validateEmployeeField('positionApplied', emp.positionApplied);

            if (empErrors.employeeName || empErrors.employeeEmail || empErrors.employeePhone ||
                empErrors.dateOfBirth || empErrors.positionApplied) {
                isValid = false;
            }

            // Validate employment fields
            emp.previousEmployments.forEach((employment, compIndex) => {
                const empltErrors: EmploymentErrors = {};
                empltErrors.companyName = validateEmploymentField('companyName', employment.companyName);
                empltErrors.hrEmail = validateEmploymentField('hrEmail', employment.hrEmail);
                empltErrors.employmentDates = validateEmploymentField('employmentDates', employment.employmentDates);
                empltErrors.designation = validateEmploymentField('designation', employment.designation);

                if (empltErrors.companyName || empltErrors.hrEmail ||
                    empltErrors.employmentDates || empltErrors.designation) {
                    isValid = false;
                }

                empErrors.employments.push(empltErrors);
            });

            return empErrors;
        });

        setErrors(newErrors);
        return isValid;
    };

    const addEmployee = () => {
        setEmployees([...employees, {
            employeeName: '',
            employeeEmail: '',
            employeePhone: '',
            dateOfBirth: '',
            positionApplied: '',
            previousEmployments: [{
                companyName: '',
                hrEmail: '',
                employmentDates: '',
                designation: '',
                uanNumber: ''
            }]
        }]);
        setErrors([...errors, createEmptyEmployeeErrors()]);
    };

    const removeEmployee = (index: number) => {
        setEmployees(employees.filter((_, i) => i !== index));
        setErrors(errors.filter((_, i) => i !== index));
    };

    const addPreviousEmployment = (empIndex: number) => {
        const updated = [...employees];
        updated[empIndex].previousEmployments.push({
            companyName: '',
            hrEmail: '',
            employmentDates: '',
            designation: '',
            uanNumber: ''
        });
        setEmployees(updated);

        const updatedErrors = [...errors];
        if (!updatedErrors[empIndex]) {
            updatedErrors[empIndex] = createEmptyEmployeeErrors();
        }
        updatedErrors[empIndex].employments.push({});
        setErrors(updatedErrors);
    };

    const removePreviousEmployment = (empIndex: number, compIndex: number) => {
        const updated = [...employees];
        updated[empIndex].previousEmployments = updated[empIndex].previousEmployments.filter((_, i) => i !== compIndex);
        setEmployees(updated);

        const updatedErrors = [...errors];
        if (updatedErrors[empIndex]?.employments) {
            updatedErrors[empIndex].employments = updatedErrors[empIndex].employments.filter((_, i) => i !== compIndex);
        }
        setErrors(updatedErrors);
    };

    const handleEmployeeChange = (empIndex: number, field: keyof Employee, value: string) => {
        const updated = [...employees];
        (updated[empIndex] as any)[field] = value;
        setEmployees(updated);

        // Clear error on change
        const updatedErrors = [...errors];
        if (updatedErrors[empIndex]) {
            (updatedErrors[empIndex] as any)[field] = undefined;
            setErrors(updatedErrors);
        }
    };

    const handleEmployeeBlur = (empIndex: number, field: keyof Employee, value: string) => {
        const error = validateEmployeeField(field, value);
        const updatedErrors = [...errors];
        if (!updatedErrors[empIndex]) {
            updatedErrors[empIndex] = createEmptyEmployeeErrors();
        }
        (updatedErrors[empIndex] as any)[field] = error;
        setErrors(updatedErrors);
    };

    const handleEmploymentChange = (empIndex: number, compIndex: number, field: keyof PreviousEmployment, value: string) => {
        const updated = [...employees];
        (updated[empIndex].previousEmployments[compIndex] as any)[field] = value;
        setEmployees(updated);

        // Clear error on change
        const updatedErrors = [...errors];
        if (updatedErrors[empIndex]?.employments?.[compIndex]) {
            (updatedErrors[empIndex].employments[compIndex] as any)[field] = undefined;
            setErrors(updatedErrors);
        }
    };

    const handleEmploymentBlur = (empIndex: number, compIndex: number, field: keyof PreviousEmployment, value: string) => {
        const error = validateEmploymentField(field, value);
        const updatedErrors = [...errors];
        if (!updatedErrors[empIndex]) {
            updatedErrors[empIndex] = createEmptyEmployeeErrors();
        }
        if (!updatedErrors[empIndex].employments[compIndex]) {
            updatedErrors[empIndex].employments[compIndex] = {};
        }
        (updatedErrors[empIndex].employments[compIndex] as any)[field] = error;
        setErrors(updatedErrors);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate entire form before submission
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Create cases for all employees
            const promises = employees.map(emp =>
                axios.post('http://localhost:3000/api/cases', {
                    clientId,
                    employeeData: {
                        employeeName: emp.employeeName,
                        employeeEmail: emp.employeeEmail,
                        employeePhone: emp.employeePhone,
                        dateOfBirth: emp.dateOfBirth,
                        positionApplied: emp.positionApplied
                    },
                    previousEmployments: emp.previousEmployments
                })
            );

            await Promise.all(promises);
            alert('All employee cases created successfully!');
            navigate('/clients');
        } catch (error) {
            console.error('Error creating cases:', error);
            alert('Failed to create employee cases. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to get input class based on error state
    const getInputClass = (hasError: boolean, baseClass: string = '') => {
        const base = baseClass || 'w-full px-4 py-2 border rounded-lg focus:ring-2';
        return hasError
            ? `${base} border-red-500 focus:ring-red-500 focus:border-red-500`
            : `${base} border-slate-300 focus:ring-blue-500`;
    };

    const getSmallInputClass = (hasError: boolean) => {
        const base = 'w-full px-3 py-2 border rounded-lg text-sm';
        return hasError
            ? `${base} border-red-500 focus:ring-red-500`
            : `${base} border-slate-300`;
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Logo />
                    <div className="mt-6">
                        <Breadcrumb items={[
                            { label: 'Home', path: '/' },
                            { label: 'Client Management', path: '/clients' },
                            { label: 'Add Employees' }
                        ]} />
                        <h1 className="text-3xl font-bold text-slate-800">Add Employees</h1>
                        <p className="text-slate-600 mt-2">Add employee details and their previous employment history</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Employee Cards */}
                    <div className="space-y-6">
                        {employees.map((employee, empIndex) => (
                            <div key={empIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                {/* Employee Header */}
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-semibold text-slate-800">Employee #{empIndex + 1}</h3>
                                    {employees.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeEmployee(empIndex)}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                            Remove Employee
                                        </button>
                                    )}
                                </div>

                                {/* Employee Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                                        <input
                                            type="text"
                                            value={employee.employeeName}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'employeeName', e.target.value)}
                                            onBlur={(e) => handleEmployeeBlur(empIndex, 'employeeName', e.target.value)}
                                            className={getInputClass(!!errors[empIndex]?.employeeName)}
                                            placeholder="Jane Smith"
                                        />
                                        {errors[empIndex]?.employeeName && (
                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].employeeName}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                                        <input
                                            type="email"
                                            value={employee.employeeEmail}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'employeeEmail', e.target.value)}
                                            onBlur={(e) => handleEmployeeBlur(empIndex, 'employeeEmail', e.target.value)}
                                            className={getInputClass(!!errors[empIndex]?.employeeEmail)}
                                            placeholder="jane@example.com"
                                        />
                                        {errors[empIndex]?.employeeEmail && (
                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].employeeEmail}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            value={employee.employeePhone}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'employeePhone', e.target.value)}
                                            onBlur={(e) => handleEmployeeBlur(empIndex, 'employeePhone', e.target.value)}
                                            className={getInputClass(!!errors[empIndex]?.employeePhone)}
                                            placeholder="+91-9876543210"
                                        />
                                        {errors[empIndex]?.employeePhone && (
                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].employeePhone}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={employee.dateOfBirth}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'dateOfBirth', e.target.value)}
                                            onBlur={(e) => handleEmployeeBlur(empIndex, 'dateOfBirth', e.target.value)}
                                            className={getInputClass(!!errors[empIndex]?.dateOfBirth)}
                                        />
                                        {errors[empIndex]?.dateOfBirth && (
                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].dateOfBirth}</p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Position Applied For *</label>
                                        <input
                                            type="text"
                                            value={employee.positionApplied}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'positionApplied', e.target.value)}
                                            onBlur={(e) => handleEmployeeBlur(empIndex, 'positionApplied', e.target.value)}
                                            className={getInputClass(!!errors[empIndex]?.positionApplied)}
                                            placeholder="Senior Developer"
                                        />
                                        {errors[empIndex]?.positionApplied && (
                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].positionApplied}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Previous Employment History */}
                                <div className="border-t border-slate-200 pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-lg font-semibold text-slate-800">Previous Employment History</h4>
                                        <button
                                            type="button"
                                            onClick={() => addPreviousEmployment(empIndex)}
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            + Add Company
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {employee.previousEmployments.map((employment, compIndex) => (
                                            <div key={compIndex} className="bg-slate-50 rounded-lg p-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-sm font-medium text-slate-700">Company #{compIndex + 1}</span>
                                                    {employee.previousEmployments.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removePreviousEmployment(empIndex, compIndex)}
                                                            className="text-red-600 hover:text-red-700 text-xs"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Company Name *</label>
                                                        <input
                                                            type="text"
                                                            value={employment.companyName}
                                                            onChange={(e) => handleEmploymentChange(empIndex, compIndex, 'companyName', e.target.value)}
                                                            onBlur={(e) => handleEmploymentBlur(empIndex, compIndex, 'companyName', e.target.value)}
                                                            className={getSmallInputClass(!!errors[empIndex]?.employments?.[compIndex]?.companyName)}
                                                            placeholder="Previous Corp Ltd"
                                                        />
                                                        {errors[empIndex]?.employments?.[compIndex]?.companyName && (
                                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].employments[compIndex].companyName}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">HR Email *</label>
                                                        <input
                                                            type="email"
                                                            value={employment.hrEmail}
                                                            onChange={(e) => handleEmploymentChange(empIndex, compIndex, 'hrEmail', e.target.value)}
                                                            onBlur={(e) => handleEmploymentBlur(empIndex, compIndex, 'hrEmail', e.target.value)}
                                                            className={getSmallInputClass(!!errors[empIndex]?.employments?.[compIndex]?.hrEmail)}
                                                            placeholder="hr@previouscorp.com"
                                                        />
                                                        {errors[empIndex]?.employments?.[compIndex]?.hrEmail && (
                                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].employments[compIndex].hrEmail}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Employment Dates *</label>
                                                        <input
                                                            type="text"
                                                            value={employment.employmentDates}
                                                            onChange={(e) => handleEmploymentChange(empIndex, compIndex, 'employmentDates', e.target.value)}
                                                            onBlur={(e) => handleEmploymentBlur(empIndex, compIndex, 'employmentDates', e.target.value)}
                                                            className={getSmallInputClass(!!errors[empIndex]?.employments?.[compIndex]?.employmentDates)}
                                                            placeholder="2020-01-15 to 2023-06-30"
                                                        />
                                                        {errors[empIndex]?.employments?.[compIndex]?.employmentDates && (
                                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].employments[compIndex].employmentDates}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Designation *</label>
                                                        <input
                                                            type="text"
                                                            value={employment.designation}
                                                            onChange={(e) => handleEmploymentChange(empIndex, compIndex, 'designation', e.target.value)}
                                                            onBlur={(e) => handleEmploymentBlur(empIndex, compIndex, 'designation', e.target.value)}
                                                            className={getSmallInputClass(!!errors[empIndex]?.employments?.[compIndex]?.designation)}
                                                            placeholder="Software Engineer"
                                                        />
                                                        {errors[empIndex]?.employments?.[compIndex]?.designation && (
                                                            <p className="text-red-500 text-xs mt-1">{errors[empIndex].employments[compIndex].designation}</p>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">UAN Number (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={employment.uanNumber}
                                                            onChange={(e) => handleEmploymentChange(empIndex, compIndex, 'uanNumber', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                            placeholder="123456789012"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Employee Button */}
                    <button
                        type="button"
                        onClick={addEmployee}
                        className="mt-6 w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                    >
                        + Add Another Employee
                    </button>

                    {/* Submit Buttons */}
                    <div className="mt-8 flex gap-4">
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
                            {loading ? 'Creating Cases...' : `Create ${employees.length} Employee Case${employees.length > 1 ? 's' : ''}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEmployees;
