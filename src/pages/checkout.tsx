# 🔍 INTERSWITCH TEST MODE - CREDENTIALS VERIFIED

## ✅ Current Configuration:

### TEST Mode Credentials (Currently Using):
```
Merchant Code: MX250773 ✅
Pay Item ID: Default_Payable_MX250773 ✅
Data Ref (MAC Key): Yo4QhcQSN1LNRB5CKEG0bilvlt/B1w3N0dEDwFFZkLmu99/AciczpClGm1813VCq ✅
Client ID: IKIA2C7E2D07F6B2A3B0D577FB054033009D369B5BCD ✅
Secret Key: Cd1P1jJKQoTCV50 ✅
Merchant ID: 064836 ✅
Mode: TEST ✅
```

### LIVE Mode Credentials (For Future Use):
```
Merchant Code: MX162337
Pay Item ID: MX162337_MERCHANT_APP
Data Ref (MAC Key): 3tJm5LpGEwQrJAJQ1+btaWTGqzYElEFqonfhFy6vCGA=
Client ID: IKIAB57F1E19E5786DD4CDD130AD8087FCE91A87A24E
Secret Key: EphJ6hQZgXO33jJ
Merchant ID: 40375312820275
Mode: LIVE
```

---

## ❌ Current Error:

```
Response Code: Z4
Response Description: MERCHANT_OR_PAYMENT_ITEM_DOES_NOT_EXIST
```

---

## 🎯 The Issue:

Even though your credentials are correct, Interswitch is saying the merchant or pay item doesn't exist. This typically means:

1. **The Pay Item needs to be created in the dashboard**
2. **The account needs to be activated for inline checkout**
3. **TEST mode might not be fully enabled**

---

## 🚀 SOLUTIONS:

### Solution 1: Create Pay Item in Dashboard

**Steps:**

1. **Login:** https://business.quickteller.com/dashboard
2. **Switch to TEST mode** (if there's a toggle)
3. **Go to:** Settings → Pay Items (or Integration → Pay Items)
4. **Click:** "Create Pay Item" or "Add Pay Item"
5. **Fill in:**
   - **Name:** Default Payable
   - **Code/ID:** `Default_Payable_MX250773`
   - **Type:** Variable Amount (or leave empty)
   - **Status:** Active
6. **Save**

---

### Solution 2: Contact Interswitch Support

Since you're getting Z4 error, you need to contact Interswitch to:

1. **Activate your account for inline checkout**
2. **Enable TEST mode properly**
3. **Verify the Pay Item ID**

**Contact Details:**
- **Email:** support@interswitchgroup.com
- **Phone:** +234 1 448 0200
- **Dashboard:** https://business.quickteller.com/dashboard

**What to say:**
```
Hello,

I'm trying to integrate Interswitch inline checkout for my merchant account.

Merchant Code: MX250773
Pay Item ID: Default_Payable_MX250773
Mode: TEST

I'm getting error Z4: MERCHANT_OR_PAYMENT_ITEM_DOES_NOT_EXIST

Can you please:
1. Verify my merchant account is active for inline checkout
2. Confirm the correct Pay Item ID format
3. Enable TEST mode for my account
4. Help me create the Pay Item if it doesn't exist

Thank you!
```

---

### Solution 3: Try Alternative Pay Item ID Formats

Sometimes the Pay Item ID format is different. Let me create versions to try:

#### Option A: Just Merchant Code
```typescript
pay_item_id: "MX250773"
```

#### Option B: Default Format
```typescript
pay_item_id: "101"
```

#### Option C: Without Prefix
```typescript
pay_item_id: "Default_Payable"
```

---

## 🔧 Quick Test - Try Different Pay Item IDs:

Let me update the code to try the merchant code as Pay Item ID:

<function_calls>
<invoke name="filesystem__edit_file">
<parameter name="edits">[{"newText": "      // Interswitch Inline Checkout Configuration\n      const paymentConfig = {\n        merchant_code: \"MX250773\",\n        pay_item_id: \"101\", // Try default pay item ID\n        txn_ref: txnRef,\n        amount: amount,\n        currency: 566, // NGN currency code\n        site_redirect_url: window.location.origin + \"/order-status?id=\" + createdOrder.id,\n        cust_id: createdOrder.id.toString(),\n        cust_name: orderData.customerName,\n        cust_email: orderData.customerEmail || \"customer@nibbleskitchen.com\",\n        cust_phone: orderData.customerPhone || \"\",\n        \n        // IMPORTANT: Set mode to TEST for sandbox, LIVE for production\n        mode: \"TEST\", // Change to \"LIVE\" when ready for production", "oldText": "      // Interswitch Inline Checkout Configuration\n      const paymentConfig = {\n        merchant_code: \"MX250773\",\n        pay_item_id: \"Default_Payable_MX250773\",\n        txn_ref: txnRef,\n        amount: amount,\n        currency: 566, // NGN currency code\n        site_redirect_url: window.location.origin + \"/order-status?id=\" + createdOrder.id,\n        cust_id: createdOrder.id.toString(),\n        cust_name: orderData.customerName,\n        cust_email: orderData.customerEmail || \"customer@nibbleskitchen.com\",\n        cust_phone: orderData.customerPhone || \"\",\n        \n        // IMPORTANT: Set mode to TEST for sandbox, LIVE for production\n        mode: \"TEST\", // Change to \"LIVE\" when ready for production"}]