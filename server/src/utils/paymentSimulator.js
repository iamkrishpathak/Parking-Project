const { randomUUID } = require('crypto');

const simulateRazorpayPayment = async ({ amount, currency = 'INR' }) => {
  if (!amount) {
    throw new Error('Amount is required for payment simulation');
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    status: 'captured',
    currency,
    amount,
    paymentId: `pay_${randomUUID().replace(/-/g, '').slice(0, 14)}`,
  };
};

module.exports = { simulateRazorpayPayment };

