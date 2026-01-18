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
    };

    const removeEmployee = (index: number) => {
        setEmployees(employees.filter((_, i) => i !== index));
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
    };

    const removePreviousEmployment = (empIndex: number, compIndex: number) => {
        const updated = [...employees];
        updated[empIndex].previousEmployments = updated[empIndex].previousEmployments.filter((_, i) => i !== compIndex);
        setEmployees(updated);
    };

    const handleEmployeeChange = (empIndex: number, field: keyof Employee, value: string) => {
        const updated = [...employees];
        (updated[empIndex] as any)[field] = value;
        setEmployees(updated);
    };

    const handleEmploymentChange = (empIndex: number, compIndex: number, field: keyof PreviousEmployment, value: string) => {
        const updated = [...employees];
        (updated[empIndex].previousEmployments[compIndex] as any)[field] = value;
        setEmployees(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Jane Smith"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                                        <input
                                            type="email"
                                            value={employee.employeeEmail}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'employeeEmail', e.target.value)}
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="jane@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            value={employee.employeePhone}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'employeePhone', e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="+91-9876543210"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={employee.dateOfBirth}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'dateOfBirth', e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Position Applied For *</label>
                                        <input
                                            type="text"
                                            value={employee.positionApplied}
                                            onChange={(e) => handleEmployeeChange(empIndex, 'positionApplied', e.target.value)}
                                            required
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Senior Developer"
                                        />
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
                                                            required
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                            placeholder="Previous Corp Ltd"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">HR Email *</label>
                                                        <input
                                                            type="email"
                                                            value={employment.hrEmail}
                                                            onChange={(e) => handleEmploymentChange(empIndex, compIndex, 'hrEmail', e.target.value)}
                                                            required
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                            placeholder="hr@previouscorp.com"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Employment Dates *</label>
                                                        <input
                                                            type="text"
                                                            value={employment.employmentDates}
                                                            onChange={(e) => handleEmploymentChange(empIndex, compIndex, 'employmentDates', e.target.value)}
                                                            required
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                            placeholder="2020-01-15 to 2023-06-30"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Designation *</label>
                                                        <input
                                                            type="text"
                                                            value={employment.designation}
                                                            onChange={(e) => handleEmploymentChange(empIndex, compIndex, 'designation', e.target.value)}
                                                            required
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                            placeholder="Software Engineer"
                                                        />
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
