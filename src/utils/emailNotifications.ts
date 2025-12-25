/**
 * Email notification utilities
 * 
 * Note: This is a structure for email notifications.
 * To actually send emails, you'll need to:
 * 1. Set up an email service (SendGrid, Resend, AWS SES, etc.)
 * 2. Create a backend API endpoint or Supabase Edge Function
 * 3. Call that endpoint from the frontend
 * 
 * For now, this provides the structure and can be extended.
 */

export type EmailType = 
  | "order_confirmation"
  | "order_status_update"
  | "order_cancelled"
  | "order_ready"
  | "order_delivered";

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Generate order confirmation email
 */
export function generateOrderConfirmationEmail(
  customerEmail: string,
  orderId: number,
  orderDate: string,
  items: Array<{ name: string; quantity: number; weight: number }>,
  totalWeight: number
): EmailData {
  const itemsList = items.map(item => 
    `- ${item.name} (Qty: ${item.quantity}, Weight: ${item.weight.toFixed(3)}g)`
  ).join("\n");

  return {
    to: customerEmail,
    subject: `Order Confirmation #${orderId}`,
    body: `Thank you for your order!

Order ID: #${orderId}
Date: ${new Date(orderDate).toLocaleString()}

Items:
${itemsList}

Total Weight: ${totalWeight.toFixed(3)} grams

Your order is being processed and you will be notified when it's ready.

Thank you for your business!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B6F47;">Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> #${orderId}</p>
          <p><strong>Date:</strong> ${new Date(orderDate).toLocaleString()}</p>
        </div>
        <h3>Items:</h3>
        <ul>
          ${items.map(item => `<li>${item.name} (Qty: ${item.quantity}, Weight: ${item.weight.toFixed(3)}g)</li>`).join("")}
        </ul>
        <p><strong>Total Weight:</strong> ${totalWeight.toFixed(3)} grams</p>
        <p>Your order is being processed and you will be notified when it's ready.</p>
        <p>Thank you for your business!</p>
      </div>
    `
  };
}

/**
 * Generate order status update email
 */
export function generateOrderStatusUpdateEmail(
  customerEmail: string,
  orderId: number,
  oldStatus: string,
  newStatus: string
): EmailData {
  const statusMessages: Record<string, string> = {
    "ready": "Your order is ready for pickup/delivery!",
    "delivered": "Your order has been delivered. Thank you!",
    "cancelled": "Your order has been cancelled.",
  };

  return {
    to: customerEmail,
    subject: `Order #${orderId} Status Update`,
    body: `Your order status has been updated.

Order ID: #${orderId}
Previous Status: ${oldStatus}
New Status: ${newStatus}

${statusMessages[newStatus] || "Your order status has been updated."}

Thank you!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B6F47;">Order Status Update</h2>
        <p>Your order status has been updated.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> #${orderId}</p>
          <p><strong>Previous Status:</strong> ${oldStatus}</p>
          <p><strong>New Status:</strong> ${newStatus}</p>
        </div>
        <p>${statusMessages[newStatus] || "Your order status has been updated."}</p>
        <p>Thank you!</p>
      </div>
    `
  };
}

/**
 * Send email notification
 * 
 * This is a placeholder. Replace with actual email service integration.
 * Example: Call your backend API or Supabase Edge Function
 */
export async function sendEmailNotification(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement actual email sending
  // Example:
  // const response = await fetch('/api/send-email', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(emailData)
  // });
  // return await response.json();

  console.log("Email notification (not sent - implement email service):", emailData);
  
  // For now, just log it
  return { success: true };
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(
  customerEmail: string,
  orderId: number,
  orderDate: string,
  items: Array<{ name: string; quantity: number; weight: number }>,
  totalWeight: number
) {
  const emailData = generateOrderConfirmationEmail(customerEmail, orderId, orderDate, items, totalWeight);
  return await sendEmailNotification(emailData);
}

/**
 * Send order status update email
 */
export async function sendOrderStatusUpdate(
  customerEmail: string,
  orderId: number,
  oldStatus: string,
  newStatus: string
) {
  const emailData = generateOrderStatusUpdateEmail(customerEmail, orderId, oldStatus, newStatus);
  return await sendEmailNotification(emailData);
}

