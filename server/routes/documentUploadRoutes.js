const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    saveDocument,
    getDocument,
    getDocumentsByCheck,
    getDocumentsByCase,
    deleteDocument,
    logActivity
} = require('../services/database');

// Configure Multer for file uploads (in-memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

/**
 * Upload document for a specific check
 * POST /api/document-upload/upload
 */
router.post('/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { clientId, caseId, checkId, documentType } = req.body;

        if (!clientId || !caseId || !checkId || !documentType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const fileData = {
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            fileBuffer: req.file.buffer
        };

        const result = await saveDocument(clientId, caseId, checkId, documentType, fileData);

        // Process extraction in background (or await if fast enough - 1.5 Flash is fast)
        // We'll await it to provide immediate feedback in logs/DB
        try {
            const { extractDocumentData } = require('../services/geminiService');
            const { updateDocumentMetadata } = require('../services/database');

            console.log(`🔍 Extracting data from document ${result.documentId}...`);
            const extractedData = await extractDocumentData(fileData.fileBuffer, fileData.fileType);

            if (extractedData) {
                console.log('✅ Extraction successful:', extractedData.employeeName);
                await updateDocumentMetadata(result.documentId, {
                    extractedData: extractedData
                });
            } else {
                console.log('⚠️ No data extracted from document');
            }
        } catch (extractionError) {
            console.error('Extraction failed:', extractionError);
            // Don't fail the upload just because extraction failed
        }

        // Log activity
        await logActivity(
            'check',
            checkId,
            'DOCUMENT_UPLOADED',
            `Document uploaded: ${req.file.originalname} (${documentType})`,
            { fileName: req.file.originalname, documentType, fileSize: req.file.size }
        );

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            document: result
        });

    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
            error: 'Failed to upload document',
            details: error.message
        });
    }
});

/**
 * Get all documents for a specific check
 * GET /api/document-upload/check/:checkId
 */
router.get('/check/:checkId', async (req, res) => {
    try {
        const { checkId } = req.params;
        const documents = await getDocumentsByCheck(checkId);

        res.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({
            error: 'Failed to fetch documents'
        });
    }
});

/**
 * Get all documents for a specific case
 * GET /api/document-upload/case/:caseId
 */
router.get('/case/:caseId', async (req, res) => {
    try {
        const { caseId } = req.params;
        const documents = await getDocumentsByCase(caseId);

        res.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({
            error: 'Failed to fetch documents'
        });
    }
});

/**
 * Download a specific document
 * GET /api/document-upload/download/:documentId
 */
router.get('/download/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await getDocument(documentId);

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.setHeader('Content-Type', document.fileType);
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
        res.send(document.fileData);

    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({
            error: 'Failed to download document'
        });
    }
});

/**
 * Delete a document
 * DELETE /api/document-upload/:documentId
 */
router.delete('/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        await deleteDocument(documentId);

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({
            error: 'Failed to delete document'
        });
    }
});

module.exports = router;
