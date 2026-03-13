const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('Email service not configured or error:', error.message);
  } else {
    console.log('Email service ready for sending');
  }
});

const sendKYCApprovedEmail = async (userEmail, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@parkbandhu.com',
    to: userEmail,
    subject: 'KYC Verification Approved - ParkBandhu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>KYC Verification Approved!</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>Hello ${userName},</p>
          <p style="font-size: 16px; line-height: 1.6;">
            Great news! Your KYC verification has been <strong>approved</strong> by our admin team. 
            You can now access all features of ParkBandhu.
          </p>
          <div style="background-color: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0;"><strong>Status:</strong> Verified ✓</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p style="font-size: 14px; color: #666;">
            If you have any questions, please contact our support team.
          </p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/driver" 
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('KYC approved email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending KYC approved email:', error);
  }
};

const sendKYCRejectedEmail = async (userEmail, userName, reason) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@parkbandhu.com',
    to: userEmail,
    subject: 'KYC Verification Rejected - ParkBandhu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>KYC Verification Status Update</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>Hello ${userName},</p>
          <p style="font-size: 16px; line-height: 1.6;">
            Unfortunately, your KYC verification has been <strong>rejected</strong>.
          </p>
          <div style="background-color: white; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
            <p style="margin: 0;"><strong>Reason:</strong></p>
            <p style="margin: 5px 0; color: #666;">${reason}</p>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">
            Please review the documents and <strong>resubmit</strong> with the correct information.
          </p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/host-kyc" 
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Resubmit KYC
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If you need help, please contact our support team.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('KYC rejected email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending KYC rejected email:', error);
  }
};

const sendDocumentRequestEmail = async (userEmail, userName, documents, message) => {
  const docList = documents.join(', ');
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@parkbandhu.com',
    to: userEmail,
    subject: 'Additional Documents Required - ParkBandhu KYC',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Additional Documents Required</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>Hello ${userName},</p>
          <p style="font-size: 16px; line-height: 1.6;">
            The admin team has reviewed your KYC submission and requires additional documents to complete the verification.
          </p>
          <div style="background-color: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; margin-bottom: 10px;"><strong>Documents Needed:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              ${documents.map(doc => `<li>${doc}</li>`).join('')}
            </ul>
          </div>
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Additional Notes:</strong></p>
            <p style="margin: 5px 0; color: #666;">${message}</p>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">
            Please upload the required documents to proceed with verification.
          </p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/host-kyc" 
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Upload Documents
            </a>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Document request email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending document request email:', error);
  }
};

const sendKYCSubmittedNotificationToAdmin = async (userName, userEmail, role) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@parkbandhu.com';
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@parkbandhu.com',
    to: adminEmail,
    subject: `New KYC Submission - ${userName} (${role})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>New KYC Submission Received</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>A new KYC submission has been received and is awaiting verification.</p>
          <div style="background-color: white; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <p style="margin: 0; margin-bottom: 8px;"><strong>User Details:</strong></p>
            <p style="margin: 5px 0;">Name: ${userName}</p>
            <p style="margin: 5px 0;">Email: ${userEmail}</p>
            <p style="margin: 5px 0;">Role: ${role === 'host' ? 'Parking Owner' : 'Driver'}</p>
            <p style="margin: 5px 0;">Submitted: ${new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/admin" 
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review in Admin Panel
            </a>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent');
  } catch (error) {
    console.error('Error sending admin notification email:', error);
  }
};

module.exports = {
  sendKYCApprovedEmail,
  sendKYCRejectedEmail,
  sendDocumentRequestEmail,
  sendKYCSubmittedNotificationToAdmin,
};
