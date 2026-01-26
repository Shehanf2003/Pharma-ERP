import nodemailer from 'nodemailer';

// Configure Nodemailer (Using Ethereal for Dev, or Environment variables for Prod)
// In a real app, use process.env.SMTP_HOST, etc.
const createTransporter = async () => {
  // For development, we create a test account on the fly if no env vars are present
  if (!process.env.SMTP_HOST) {
    const testAccount = await nodemailer.createTestAccount();
    console.log('NotificationService: Created Ethereal Test Account:', testAccount.user);

    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

let transporter = null;

const getTransporter = async () => {
    if (!transporter) {
        transporter = await createTransporter();
    }
    return transporter;
}

export const sendEmail = async (to, subject, html) => {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: '"Pharma ERP System" <system@pharmaerp.local>',
      to,
      subject,
      html,
    });

    console.log("NotificationService: Email sent: %s", info.messageId);
    // Preview only available when using Ethereal account
    if (nodemailer.getTestMessageUrl(info)) {
        console.log("NotificationService: Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (error) {
    console.error("NotificationService: Email failed", error);
    return false;
  }
};

/**
 * Sends an SMS using a provider (Placeholder).
 * Replace the logic inside this function with your local gateway API (Dialog/Mobitel/TextWare).
 *
 * @param {string} phoneNumber - The recipient's phone number (e.g., +94771234567)
 * @param {string} message - The text message content
 */
export const sendSMS = async (phoneNumber, message) => {
  if (!phoneNumber) {
      console.warn("NotificationService: No phone number provided for SMS.");
      return false;
  }

  // --- INTEGRATION POINT ---
  // Here you would make an axios call to your SMS Gateway
  // Example:
  // await axios.get(`https://api.dialog.lk/sms?to=${phoneNumber}&msg=${encodeURIComponent(message)}&key=YOUR_KEY`);

  console.log(`[SMS GATEWAY MOCK] Sending to ${phoneNumber}: "${message}"`);
  return true;
};

export const sendLowStockAlert = async (users, product, locationName, currentQty) => {
    const subject = `Low Stock Alert: ${product.name}`;
    const message = `
        <h3>Low Stock Warning</h3>
        <p>Product <strong>${product.name}</strong> is running low at <strong>${locationName}</strong>.</p>
        <p>Current Quantity: <span style="color:red; font-weight:bold;">${currentQty}</span></p>
        <p>Minimum Level: ${product.minStockLevel}</p>
        <p>Please restock immediately.</p>
    `;

    const smsMessage = `ALERT: ${product.name} is low (${currentQty}) at ${locationName}. Re-order ASAP.`;

    const promises = users.map(async (user) => {
        // Send Email
        await sendEmail(user.email, subject, message);

        // Send SMS (if phone number exists)
        if (user.phoneNumber) {
            await sendSMS(user.phoneNumber, smsMessage);
        }
    });

    await Promise.all(promises);
  };

export const sendBillNotification = async (contactInfo, saleData) => {
    // Assuming Frontend is running on same host or configured via env
    // For dev defaults:
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const billUrl = `${frontendUrl}/bill/${saleData._id}`;

    const subject = `Your Receipt from Pharma ERP - ${saleData.receiptNumber}`;
    const html = `
        <h2>Thank you for your purchase!</h2>
        <p>Your receipt <strong>${saleData.receiptNumber}</strong> is ready.</p>
        <p>Total Amount: <strong>Rs. ${saleData.totalAmount}</strong></p>
        <p>Click the link below to view your full e-bill:</p>
        <p><a href="${billUrl}">${billUrl}</a></p>
        <br/>
        <p>Date: ${new Date(saleData.createdAt).toLocaleString()}</p>
    `;

    const smsMessage = `Thanks for shopping! View your bill for Rs.${saleData.totalAmount} here: ${billUrl}`;

    if (contactInfo.email) {
        await sendEmail(contactInfo.email, subject, html);
    }

    if (contactInfo.phone) {
        await sendSMS(contactInfo.phone, smsMessage);
    }
};
