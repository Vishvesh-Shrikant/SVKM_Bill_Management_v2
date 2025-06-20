# Invoice Reports API Updates

## Overview

Updated five invoice report APIs to follow the same structure as the Outstanding Bills Report with vendor grouping, subtotals, and grand totals. Also updated the Outstanding Bills Report to remove `natureOfWorkSupply` and add payment-related fields.

## Updated APIs

### Outstanding Bills Report Changes
**Endpoint:** `GET /api/reports/outstanding-bills`

**Changes Made:**
- ❌ Removed: `natureOfWorkSupply` field
- ✅ Added: `paymentInstructions` field 
- ✅ Added: `remarksForPaymentInstructions` field

**Updated Response Fields:**
```json
{
  "srNo": 11,
  "region": "SHIRPUR",
  "vendorNo": 503072,
  "vendorName": "Premiere Electrical Solutions LLP",
  "taxInvNo": "PESL/859/24-25",
  "taxInvDate": "28-11-2024",
  "taxInvAmt": 242949,
  "copAmt": 242949,
  "dateRecdInAcctsDept": "25-01-2025",
  "paymentInstructions": "Transfer to vendor account",
  "remarksForPaymentInstructions": "Payment to be made within 30 days"
}
```

## Outstanding Bills Report Field Changes

### Before:
```json
{
  "srNo": 11,
  "region": "SHIRPUR",
  "vendorNo": 503072,
  "vendorName": "Premiere Electrical Solutions LLP",
  "taxInvNo": "PESL/859/24-25",
  "taxInvDate": "28-11-2024",
  "taxInvAmt": 242949,
  "copAmt": 242949,
  "dateRecdInAcctsDept": "25-01-2025",
  "natureOfWorkSupply": "681b8469b9a3d85eecf37bae"  // ❌ REMOVED
}
```

### After:
```json
{
  "srNo": 11,
  "region": "SHIRPUR", 
  "vendorNo": 503072,
  "vendorName": "Premiere Electrical Solutions LLP",
  "taxInvNo": "PESL/859/24-25",
  "taxInvDate": "28-11-2024",
  "taxInvAmt": 242949,
  "copAmt": 242949,
  "dateRecdInAcctsDept": "25-01-2025",
  "paymentInstructions": "Transfer to vendor account",           // ✅ ADDED
  "remarksForPaymentInstructions": "Payment within 30 days"      // ✅ ADDED
}
```

### Field Changes Summary:
- **Removed:** `natureOfWorkSupply` field
- **Added:** `paymentInstructions` field from bill model
- **Added:** `remarksForPaymentInstructions` field from bill model

These new fields provide better payment-related information for accounts department processing.

## Updated APIs

### 1. Invoices Received at Site Report
**Endpoint:** `GET /api/reports/invoices-received-at-site`

**Filter Logic:** 
- Date of tax invoice received at site is filled
- Sent to Mumbai is blank

**Query Parameters:**
- `startDate` - Filter by start date (optional)
- `endDate` - Filter by end date (optional) 
- `region` - Filter by region (optional)
- `vendor` - Filter by vendor name (optional)

### 2. Invoices Couriered to Mumbai Report
**Endpoint:** `GET /api/reports/invoices-courier-to-mumbai`

**Filter Logic:**
- Date of tax invoice received at site is filled
- Sent to Mumbai is filled

**Query Parameters:**
- `startDate` - Filter by start date (optional)
- `endDate` - Filter by end date (optional)
- `region` - Filter by region (optional)
- `nameSiteOffice` - Filter by site office name (optional)
- `vendor` - Filter by vendor name (optional)

### 3. Invoices Received at Mumbai Report
**Endpoint:** `GET /api/reports/invoices-received-at-mumbai`

**Filter Logic:**
- Date of tax invoice received at Mumbai is filled
- Sent to accounts department is blank

**Query Parameters:**
- `startDate` - Filter by start date (optional)
- `endDate` - Filter by end date (optional)
- `region` - Filter by region (optional)
- `vendor` - Filter by vendor name (optional)

### 4. Invoices Given to Accounts Department Report
**Endpoint:** `GET /api/reports/invoices-given-to-accounts`

**Filter Logic:**
- Date of tax invoice received at Mumbai is filled
- Sent to accounts department is filled

**Query Parameters:**
- `startDate` - Filter by start date (optional)
- `endDate` - Filter by end date (optional)
- `region` - Filter by region (optional)
- `vendor` - Filter by vendor name (optional)

### 5. Invoices Given to QS Site Report
**Endpoint:** `GET /api/reports/invoices-given-to-qs-site`

**Filter Logic:**
- Date of invoice given to QS site is filled

**Query Parameters:**
- `startDate` - Filter by start date (optional)
- `endDate` - Filter by end date (optional)
- `region` - Filter by region (optional)
- `vendor` - Filter by vendor name (optional)

## Key Features Added to All Reports

### 1. Vendor Grouping
- Bills are now grouped by vendor name
- Each vendor group is sorted alphabetically
- Bills within each vendor group are sorted by relevant date

### 2. Subtotals
- Each vendor group has a subtotal row with:
  - `isSubtotal: true` flag
  - Vendor name and subtotal label
  - Total amount and COP amount for that vendor
  - Count of bills for that vendor

### 3. Grand Total
- Final row with grand totals across all vendors:
  - `isGrandTotal: true` flag
  - Grand total label
  - Total invoice amount and COP amount
  - Total count of all bills

### 4. Summary Section
- `vendorSubtotals` array with breakdown per vendor
- Overall totals for invoice amounts and COP amounts
- Total record count

### 5. Enhanced Filtering
- Added vendor filter support to all five APIs
- Maintained existing filters (date range, region, etc.)
- Uses populated vendor data for accurate grouping

## Authorization

Each endpoint maintains their existing authorization:
- **Invoices Received at Site:** Site officer, Site PIMO, QS site roles
- **Invoices Couriered to Mumbai:** Site officer, Site PIMO, QS site roles
- **Invoices Received at Mumbai:** PIMO Mumbai roles
- **Invoices Given to Accounts:** PIMO Mumbai and accounts roles
- **Invoices Given to QS Site:** Site PIMO and QS site roles

## Data Fields

### Common Fields in All Reports:
- `srNo` - Sequential number
- `region` - Region name
- `vendorNo` - Vendor number (from populated vendor)
- `vendorName` - Vendor name (from populated vendor)
- `taxInvNo` - Tax invoice number
- `taxInvDate` - Tax invoice date (formatted as DD-MM-YYYY)
- `taxInvAmt` - Tax invoice amount
- `copAmt` - COP amount
- `poNo` - Purchase order number

### Outstanding Bills Report Specific Fields:
- `dateRecdInAcctsDept` - Date received in accounts department
- `paymentInstructions` - Payment instructions
- `remarksForPaymentInstructions` - Remarks for payment instructions

### Other Reports Specific Fields:
- `natureOfWorkSupply` - Nature of work/supply (all reports except Outstanding Bills)

## Common Response Structure

All five updated APIs now return data in the following consistent format:

```json
{
  "report": {
    "title": "[Report Name] Report",
    "generatedAt": "2025-06-21T...",
    "filterCriteria": {
      "logic": "[Filter description]",
      "sorting": ["vendorName", "[relevant date field]"]
    },
    "data": [
      {
        "srNo": 1,
        "region": "MUMBAI",
        "vendorNo": 123456,
        "vendorName": "ABC Company Ltd",
        "taxInvNo": "INV/001/24-25",
        "taxInvDate": "15-01-2025",
        "taxInvAmt": 50000,
        "copAmt": 5000,
        "[report-specific date field]": "20-01-2025",
        "poNo": "PO123",
        "natureOfWorkSupply": "681b8469b9a3d85eecf37bae"
      },
      {
        "isSubtotal": true,
        "vendorName": "ABC Company Ltd",
        "subtotalLabel": "Subtotal for ABC Company Ltd:",
        "subtotalAmount": 50000,
        "subtotalCopAmt": 5000,
        "count": 1
      },
      {
        "isGrandTotal": true,
        "grandTotalLabel": "Grand Total:",
        "grandTotalAmount": 50000,
        "grandTotalCopAmt": 5000,
        "totalCount": 1
      }
    ],
    "summary": {
      "vendorSubtotals": [
        {
          "vendorName": "ABC Company Ltd",
          "totalAmount": 50000,
          "totalCopAmount": 5000,
          "count": 1
        }
      ],
      "totalInvoiceAmount": 50000,
      "totalCopAmount": 5000,
      "recordCount": 1
    }
  }
}
```

## Report-Specific Date Fields

Each report includes relevant date fields:

- **Invoices Received at Site:** `dtTaxInvRecdAtSite`
- **Invoices Couriered to Mumbai:** `dtTaxInvRecdAtSite`, `dtTaxInvCourierToMumbai`
- **Invoices Received at Mumbai:** `dtTaxInvRecdAtSite`, `dtTaxInvRecdAtMumbai`
- **Invoices Given to Accounts:** `dtGivenToAcctsDept`
- **Invoices Given to QS Site:** `dtGivenToQsSite`

## Testing

To test these APIs, use the following example requests:

```bash
# Invoices Received at Site
GET /api/reports/invoices-received-at-site?startDate=2025-01-01&endDate=2025-01-31&region=MUMBAI

# Invoices Couriered to Mumbai
GET /api/reports/invoices-courier-to-mumbai?startDate=2025-01-01&endDate=2025-01-31&vendor=ABC Company Ltd

# Invoices Received at Mumbai
GET /api/reports/invoices-received-at-mumbai?startDate=2025-01-01&endDate=2025-01-31&region=MUMBAI

# Invoices Given to Accounts
GET /api/reports/invoices-given-to-accounts?startDate=2025-01-01&endDate=2025-01-31&vendor=ABC Company Ltd

# Invoices Given to QS Site
GET /api/reports/invoices-given-to-qs-site?startDate=2025-01-01&endDate=2025-01-31&region=MUMBAI
```

All five APIs now provide consistent, structured data that matches the Outstanding Bills Report format for easy frontend integration and reporting consistency.
