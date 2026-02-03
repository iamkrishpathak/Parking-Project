const mongoose = require('mongoose');

const ProviderDocsSchema = new mongoose.Schema(
    {
        provider_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        document_type: {
            type: String,
            enum: ['aadhaar', 'electricity_bill'],
            required: true,
        },
        document_url: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ProviderDocs', ProviderDocsSchema);