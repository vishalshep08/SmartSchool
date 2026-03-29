# WhatsApp Business API Setup Guide

This document provides step-by-step instructions for setting up WhatsApp Business API integration for the School Management System.

## Prerequisites

1. A Facebook Business Manager account
2. A Meta Developer account
3. A valid business phone number (not currently registered with WhatsApp)
4. Business verification documents

---

## Step 1: Create a Meta Developer Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "Get Started" or "Log In"
3. Create a developer account if you don't have one
4. Verify your email address

---

## Step 2: Create a Meta Business App

1. Go to [Meta for Developers App Dashboard](https://developers.facebook.com/apps/)
2. Click "Create App"
3. Select "Business" as the app type
4. Fill in:
   - App name: "School Management System - WhatsApp"
   - App contact email: Your email
   - Business portfolio: Select or create a business portfolio
5. Click "Create App"

---

## Step 3: Add WhatsApp to Your App

1. In your app dashboard, scroll down to "Add products to your app"
2. Find "WhatsApp" and click "Set Up"
3. You'll see the WhatsApp Business API setup page

---

## Step 4: Get API Credentials

### Get the Phone Number ID

1. In the WhatsApp section, go to "Getting Started"
2. You'll see a test phone number provided by Meta
3. Copy the **Phone Number ID** (a long numeric string)

### Get the Permanent Access Token

1. Go to "API Setup" in the WhatsApp section
2. Click on "Generate access token" (this creates a temporary token)
3. For production, create a **System User** with permanent token:
   a. Go to [Business Settings](https://business.facebook.com/settings)
   b. Navigate to "Users" → "System Users"
   c. Click "Add" to create a new system user
   d. Set role to "Admin"
   e. Add assets → Select your WhatsApp Business Account
   f. Generate a token with these permissions:
      - `whatsapp_business_messaging`
      - `whatsapp_business_management`
   g. Copy this permanent access token

---

## Step 5: Configure Your Business Phone Number

### For Production (Real Phone Number)

1. In WhatsApp API Setup, click "Add phone number"
2. Enter your business phone number
3. Verify via SMS or voice call
4. Complete the business verification process (may take 2-7 days)

### For Testing (Use Test Number)

Meta provides a test phone number that can send messages to:
- Up to 5 phone numbers you add to the "To" list
- No business verification required for testing

---

## Step 6: Set Up Environment Variables in Supabase

Navigate to your Supabase project and add these secrets:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp Phone Number ID | `1234567890123456` |
| `WHATSAPP_API_TOKEN` | Your permanent access token | `EAABcd...xyz` |

### How to Add Secrets:

1. Go to Supabase Dashboard → Settings → Edge Functions
2. Click "Add new secret"
3. Add each secret with its value
4. Secrets are encrypted and secure

---

## Step 7: Configure Webhook (Optional but Recommended)

Webhooks allow you to receive delivery status updates.

1. In Meta App Dashboard → WhatsApp → Configuration
2. Set the Callback URL to your edge function:
   ```
   https://your-project-id.supabase.co/functions/v1/whatsapp-webhook
   ```
3. Set a Verify Token (any string you choose)
4. Subscribe to webhook fields:
   - `messages`
   - `message_deliveries` (for delivery receipts)

---

## Step 8: Test the Integration

### Send a Test Message

1. Log in as Admin in the School Management System
2. Go to **WhatsApp Center** or **Settings → Integrations**
3. Try sending a test message to your registered test number

### Verify Logs

1. Check WhatsApp Logs page to see message status
2. Successful messages show "Sent" status
3. Failed messages show error details

---

## Message Templates (Optional)

For certain message types, you may need pre-approved templates:

### Create a Template

1. Go to Meta Business Manager → WhatsApp → Message Templates
2. Click "Create Template"
3. Choose category (e.g., "Utility" for notifications)
4. Fill in template content with variables like `{{1}}`, `{{2}}`
5. Submit for approval (usually 24-48 hours)

### When Templates Are Required

- Messages sent after 24 hours of last user interaction
- Marketing or promotional messages
- Bulk notifications

**Note:** Our system uses text messages which work within the 24-hour window for user-initiated conversations.

---

## Troubleshooting

### Common Errors

| Error | Solution |
|-------|----------|
| "Phone number not registered" | Ensure the recipient has WhatsApp installed |
| "Invalid access token" | Regenerate the token and update Supabase secrets |
| "Rate limit exceeded" | Wait and retry, or request higher limits |
| "Template not approved" | Use a different approved template |
| "Business verification required" | Complete business verification in Meta Business Suite |

### Debug Steps

1. Check Edge Function Logs:
   ```
   Supabase Dashboard → Edge Functions → send-whatsapp → Logs
   ```

2. Verify secrets are set correctly:
   ```
   Supabase Dashboard → Settings → Edge Functions → Secrets
   ```

3. Test with API directly using curl:
   ```bash
   curl -X POST "https://graph.facebook.com/v17.0/{PHONE_NUMBER_ID}/messages" \
     -H "Authorization: Bearer {ACCESS_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"messaging_product":"whatsapp","to":"{RECIPIENT_PHONE}","type":"text","text":{"body":"Test message"}}'
   ```

---

## Rate Limits & Quotas

| Tier | Messages/Day | Requirements |
|------|--------------|--------------|
| Unverified | 250 | None |
| Tier 1 | 1,000 | Business verified |
| Tier 2 | 10,000 | Quality rating: High |
| Tier 3 | 100,000 | Quality rating: High |
| Unlimited | Unlimited | Contact Meta |

---

## Security Best Practices

1. **Never expose tokens in client-side code** - All API calls go through Edge Functions
2. **Use permanent tokens** - Temporary tokens expire
3. **Rotate tokens periodically** - Regenerate tokens every 60-90 days
4. **Monitor message logs** - Check for unusual activity
5. **Implement rate limiting** - Our system respects quiet hours (7PM-7AM IST)

---

## Cost Information

WhatsApp Business API uses conversation-based pricing:

| Category | Cost (India) |
|----------|--------------|
| User-initiated | ~₹0.35/conversation |
| Business-initiated - Utility | ~₹0.35/conversation |
| Business-initiated - Marketing | ~₹0.70/conversation |
| Business-initiated - Authentication | ~₹0.30/conversation |

*Prices may vary. Check [Meta Business Pricing](https://business.facebook.com/wa/manage/pricing/) for current rates.*

---

## Support

- [Meta Business Help Center](https://www.facebook.com/business/help)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Developer Community](https://developers.facebook.com/community/)
