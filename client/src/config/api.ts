// API Configuration
// This file centralizes all API endpoint configuration for easy deployment

// Get API URL from environment variable (set at build time) or use localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// API endpoints
export const API_ENDPOINTS = {
    // Documents
    documents: {
        analyze: `${API_BASE_URL}/api/documents/analyze`,
    },

    // Verification
    verify: {
        base: `${API_BASE_URL}/api/verify`,
        initiate: `${API_BASE_URL}/api/verify/initiate`,
    },

    // Clients
    clients: {
        base: `${API_BASE_URL}/api/clients`,
        byId: (id: string) => `${API_BASE_URL}/api/clients/${id}`,
    },

    // Cases
    cases: {
        base: `${API_BASE_URL}/api/cases`,
        byId: (id: string) => `${API_BASE_URL}/api/cases/${id}`,
        byClient: (clientId: string) => `${API_BASE_URL}/api/cases/client/${clientId}`,
        execute: (id: string) => `${API_BASE_URL}/api/cases/${id}/execute`,
    },

    // Checks
    checks: {
        base: `${API_BASE_URL}/api/checks`,
        byId: (id: string) => `${API_BASE_URL}/api/checks/${id}`,
        byCase: (caseId: string) => `${API_BASE_URL}/api/checks/case/${caseId}`,
        execute: (id: string) => `${API_BASE_URL}/api/checks/${id}/execute`,
    },

    // Document Upload
    documentUpload: {
        base: `${API_BASE_URL}/api/document-upload`,
        upload: `${API_BASE_URL}/api/document-upload/upload`,
        byCheck: (checkId: string) => `${API_BASE_URL}/api/document-upload/check/${checkId}`,
        byCase: (caseId: string) => `${API_BASE_URL}/api/document-upload/case/${caseId}`,
        download: (docId: string) => `${API_BASE_URL}/api/document-upload/download/${docId}`,
        delete: (docId: string) => `${API_BASE_URL}/api/document-upload/${docId}`,
    },

    // Activity Logs
    activityLogs: {
        byCheck: (checkId: string) => `${API_BASE_URL}/api/activity-logs/check/${checkId}`,
    },

    // Emails
    emails: {
        all: `${API_BASE_URL}/api/emails/all`,
        byCheck: (checkId: string) => `${API_BASE_URL}/api/emails/check/${checkId}`,
        responsesByCheck: (checkId: string) => `${API_BASE_URL}/api/emails/responses/check/${checkId}`,
        responsesAll: `${API_BASE_URL}/api/emails/responses/all`,
    },

    // Zones
    zones: {
        green: `${API_BASE_URL}/api/zones/green`,
        red: `${API_BASE_URL}/api/zones/red`,
        stats: `${API_BASE_URL}/api/zones/stats`,
        review: (checkId: string) => `${API_BASE_URL}/api/zones/review/${checkId}`,
        comparison: (checkId: string) => `${API_BASE_URL}/api/zones/comparison/${checkId}`,
    },

    // Dashboard
    dashboard: {
        overview: `${API_BASE_URL}/api/dashboard/overview`,
        stats: `${API_BASE_URL}/api/dashboard/stats`,
        requests: `${API_BASE_URL}/api/dashboard/requests`,
    },

    // Calls
    calls: {
        initiate: (checkId: string) => `${API_BASE_URL}/api/calls/${checkId}/initiate`,
        status: (checkId: string) => `${API_BASE_URL}/api/calls/${checkId}/status`,
    },

    // Chat
    chat: {
        test: `${API_BASE_URL}/api/chat/test`,
    },
};

// Helper function to make API calls
export async function apiCall<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export default API_BASE_URL;
