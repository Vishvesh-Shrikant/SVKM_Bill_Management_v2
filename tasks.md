# Bill Tracking Process Flow with Role Access

## Field Types Legend
- **Auto generated**: System automatically fills these fields
- **Enter**: Manual input required
- **Drop Down**: Selection from predefined options
- **Date Calendar**: Date picker

## Role Access Indicators
Each field shows which roles have view/edit access using these columns:
- **Y**: Role has access to this field

## 1. Initial Invoice Tracking
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Sr no | Auto generated | Sequential number | Number |
| Sr no Old | Auto generated | Previous reference number | Number |
| Type of inv | Drop Down | From Type of Invoice Master | Text |
| Region | Drop Down | From Region Master | Text |
| Project Description | Enter | Description of the project | Text |
| Vendor no | From Vendor Master | Vendor reference | Numeric (6 digits) |
| Vendor Name | Auto generated | Populated from vendor master | Text |
| GST Number | Auto generated | Tax identification | Text |
| 206AB Compliance | Auto generated | Tax compliance status | Text |
| PAN Status | Auto generated | Tax ID status | Text |

## 2. Purchase Order Information
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| If PO created? | Drop Down | Yes PO created/No PO not created | Text |
| PO no | Enter | Purchase order number | Numeric (10 digits) |
| PO Dt | Enter | Purchase order date | Date Calendar |
| PO Amt | Enter | Purchase order amount | Number with two decimals |

## 3. Proforma Invoice Details
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Proforma Inv No | Enter | Proforma invoice number | Text |
| Proforma Inv Dt | Enter | Proforma invoice date | Date Calendar |
| Proforma Inv Amt | Enter | Proforma invoice amount | Number with two decimals |
| Proforma Inv Recd at site | Enter | Receipt date at site | Date Calendar |
| Proforma Inv Recd by | Enter | Name of recipient | Text |

## 4. Tax Invoice Details
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Tax Inv no | Enter | Tax invoice number | Text, Number (16 digit) |
| Tax Inv Dt | Enter | Tax invoice date | Date Calendar |
| Currency | Drop Down | From Currency master | Text |
| Tax Inv Amt | Enter | Tax invoice amount | Number with two decimals |
| Tax Inv Recd at site | Enter | Receipt date at site | Date Calendar |
| Tax Inv Recd by | Enter | Name of recipient | Text |

## 5. Additional Information
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Department | Enter | Department name | Text |
| Remarks by Site Team | Enter | Comments from site | Text |
| Attachment | Upload | Supporting documents | Limited by KB |

## 6. Advance Payment Details
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Advance Dt | Enter | Advance payment date | Date Calendar |
| Advance Amt | Enter | Advance amount | Number with two decimals |
| Advance Percentage | Enter | Percentage of total | % Number |
| Adv request entered by | Enter | Name of requester | Text |

## 7. Quality Inspection Process
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given to Quality Engineer | Enter | Date sent for quality check | Date Calendar |
| Name of Quality Engineer | Enter | Engineer name | Text |
| Dt given to QS for Inspection | Enter | Date sent to Quantity Surveyor | Date Calendar |
| Name of QS | Enter | QS name | Text |
| Checked by QS with Dt of Measurement | Enter | Measurement date | Date Calendar |
| Given to vendor-Query/Final Inv | Enter | Communication date | Date Calendar |

## 8. Certificate of Payment (COP) Process
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given to QS for COP | Enter | Date sent for certification | Date Calendar |
| Name - QS | Enter | QS name | Text |
| COP Dt | Enter | Certification date | Date Calendar |
| COP Amt | Enter | Certified amount | Number with two decimals |
| Remarks by QS Team | Enter | QS comments | Text |

## 9. MIGO (Goods Receipt) Process
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given for MIGO | Enter | Date sent for goods receipt | Date Calendar |
| MIGO no | Enter | MIGO reference number | Text |
| MIGO Dt | Enter | MIGO date | Date Calendar |
| MIGO Amt | Enter | MIGO amount | Number with two decimals |
| Migo done by | Enter | Processor name | Text |
| Dt-Inv returned to Site office | Enter | Return date | Date Calendar |

## 10. Site Approval Process
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given to Site Engineer | Enter | Date sent to engineer | Date Calendar |
| Name of Site Engineer | Enter | Engineer name | Text |
| Dt given to Architect | Enter | Date sent to architect | Date Calendar |
| Name of Architect | Enter | Architect name | Text |
| Dt given-Site Incharge | Enter | Date sent to site manager | Date Calendar |
| Name-Site Incharge | Enter | Manager name | Text |
| Remarks | Enter | Comments | Text |

## 11. PIMO (Project Information Management Office) Process
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given to Site Office for dispatch | Enter | Dispatch preparation date | Date Calendar |
| Name-Site Office | Enter | Processor name | Text |
| Status | Drop Down | Accept/reject/hold/Issue | Text |
| Dt given to PIMO Mumbai | Enter | Date sent to PIMO | Date Calendar |
| Dt recd at PIMO Mumbai | Enter | Receipt date at PIMO | Date Calendar |
| Name recd by PIMO Mumbai | Enter | Recipient name | Text |

## 12. QS Mumbai Review
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given to QS Mumbai | Enter | Date sent to QS | Date Calendar |
| Name of QS | Enter | QS name | Text |
| Dt given to PIMO Mumbai | Enter | Return date to PIMO | Date Calendar |
| Name -PIMO | Enter | PIMO staff name | Text |

## 13. IT Department Process (for IT Bills)
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given to IT Dept | Enter | Date sent to IT | Date Calendar |
| Name- given to IT Dept | Enter | Recipient name | Text |
| Dt given to PIMO Mumbai | Enter | Return date | Date Calendar |
| Name-given to PIMO | Enter | PIMO staff name | Text |

## 14. SES (Service Entry Sheet) Process
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| SES no | Enter | SES reference number | Text |
| SES Amt | Enter | SES amount | Number with two decimals |
| SES Dt | Enter | SES date | Date Calendar |
| Dt recd from IT Deptt | Enter | Return date from IT | Date Calendar |
| Dt recd from PIMO | Enter | Return date from PIMO | Date Calendar |

## 15. Management Approval Process
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given to Director/Advisor/Trustee for approval | Enter | Date sent for approval | Date Calendar |
| Dt recd back in PIMO after approval | Enter | Return date to PIMO | Date Calendar |
| Remarks PIMO Mumbai | Enter | PIMO comments | Text |

## 16. Accounts Department Process
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Dt given to Accts dept | Enter | Date sent to accounts | Date Calendar |
| Name -given by PIMO office | Enter | PIMO staff name | Text |
| Dt recd in Accts dept | Enter | Receipt date in accounts | Date Calendar |
| Dt returned back to PIMO | Enter | Return date to PIMO if query | Date Calendar |
| Dt recd back in Accts dept | Enter | Re-receipt date if returned | Date Calendar |

## 17. Payment Processing
| Field | Type | Description | Data Format |
|-------|------|-------------|------------|
| Payment instructions | Enter | Payment directions | Text |
| Remarks for pay instructions | Enter | Payment notes | Text |
| F110 Identification | Enter | Payment run ID | Text |
| Dt of Payment | Enter | Payment date | Date Calendar |
| Accts Identification | Enter | Account reference | Text |
| Payment Amt | Enter | Payment amount | Number with two decimals |
| Remarks Accts dept | Enter | Accounts comments | Text |
| Status | Auto generated | Paid/UnPaid | Text |

## Access Rights Summary

The system has several user roles with different access rights:
1. **Site Team**: Primary entry of invoice details, PO information, and tracking receipt of documents
2. **Quality Engineers**: Inspection and quality verification processes
3. **Quantity Surveyors (QS)**: Measurement validation, certification of payment
4. **Site Engineers/Architects**: Technical approval of work completed
5. **Site In-charge**: Overall site-level approval
6. **PIMO Team**: Centralized coordination and routing of documents
7. **IT Department**: Special approval for IT-related purchases
8. **Directors/Advisors/Trustees**: High-level approval for significant amounts
9. **Accounts Department**: Final processing, payment, and record-keeping


# Comprehensive Bill Tracking Process

## Overview
This document outlines the complete bill processing workflow from receipt of goods/services through final payment and filing. The process involves multiple departments, approvals, and verification steps to ensure accuracy, compliance, and proper documentation.

## Key Roles and Responsibilities

### Site Team
- **Site Engineer**: Technical verification of work quality and compliance with specifications
- **Site In-charge**: Overall responsibility for site operations and final site-level approval
- **Site Office Staff**: Administrative processing of documents at the site level
- **Quality Engineer**: Inspection of materials and workmanship

### Technical Team
- **Quantity Surveyor (QS)**: Measurement verification, quantity certification, and cost validation
- **Architect**: Design compliance verification and approval

### Project Management
- **PIMO (Project Information Management Office)**: Central coordination of document flow and tracking
- **PIMO Mumbai**: Regional hub for document processing and routing

### Finance and Administration
- **SVKM Accounts**: Financial verification, booking, and payment processing
- **IT Department**: Specialized review for IT-related purchases

### Management Approval
- **Director**: Executive approval for payments
- **Advisor**: Subject matter expertise and advisory approval
- **Trustee**: Trust-level governance and oversight approval
- **MC (Management Committee) Members**: Final payment authorization

## Detailed Workflow

## 1. Goods/Service Receipt Phase
### Receipt at Site
- **Action**: Goods or services are received at the project site
- **Responsibility**: Site Team
- **System Entry**: Initial details entered into Bills Tracker
- **Data Captured**: 
  - Type of invoice (from master list dropdown)
  - Region (from region master dropdown)
  - Project description
  - Department information

### Material Invoice/Proforma Invoice Processing
- **Action**: Initial invoice documentation received
- **Responsibility**: Site Team
- **System Entry**: Invoice details recorded
- **Data Captured**:
  - Vendor information (auto-populated from Vendor Master)
  - PO details (if applicable: number, date, amount)
  - Proforma invoice details (number, date, amount)
  - Receipt information (date received, received by whom)
  - Supporting documentation (attachments)

## 2. Quality Verification Phase
### Quality Inspection
- **Action**: Materials or completed work inspected for quality compliance
- **Responsibility**: Quality Engineer
- **System Entry**: Quality check details recorded
- **Data Captured**:
  - Date given for inspection
  - Name of Quality Engineer
  - Quality remarks (if any)

### Quantity Surveyor (QS) Inspection
- **Action**: Measurement verification and quantity validation
- **Responsibility**: Site QS
- **System Entry**: QS inspection details recorded
- **Data Captured**:
  - Date given to QS
  - Name of QS
  - Date of measurement
  - Measurement verification notes

### Vendor Query Resolution
- **Action**: Discrepancies or questions communicated to vendor
- **Responsibility**: Site Team/QS
- **System Entry**: Query details recorded
- **Data Captured**:
  - Date query sent to vendor
  - Name of staff member who communicated
  - Nature of query (in remarks)

## 3. Tax Invoice Phase
### Tax Invoice Receipt
- **Action**: Final tax invoice received with measurement sheets
- **Responsibility**: Site Team
- **System Entry**: Tax invoice details recorded
- **Data Captured**:
  - Tax invoice number, date, amount
  - Currency information
  - Receipt details (date, name)
  - GST number verification
  - Compliance status (206AB, PAN)

### QS Certification of Payment
- **Action**: QS verifies measurements and certifies payment amount
- **Responsibility**: Site QS
- **System Entry**: Certification details recorded
- **Data Captured**:
  - Date given to QS for certification
  - Name of QS
  - Certification date
  - Certified amount
  - QS remarks

## 4. MIGO (Goods Receipt) Phase
### MIGO Processing
- **Action**: Formal goods receipt entry in ERP system
- **Responsibility**: MIGO Processor
- **System Entry**: MIGO details recorded
- **Data Captured**:
  - Date given for MIGO
  - MIGO number
  - MIGO date
  - MIGO amount
  - Name of processor

### Return to Site Office
- **Action**: Documentation returned to site office for approvals
- **Responsibility**: MIGO Processor
- **System Entry**: Return details recorded
- **Data Captured**:
  - Date returned to site office

## 5. Site Approval Phase
### Site Engineer Approval
- **Action**: Technical verification and approval by Site Engineer
- **Responsibility**: Site Engineer
- **System Entry**: Approval details recorded
- **Data Captured**:
  - Date given to Site Engineer
  - Name of Site Engineer
  - Approval status

### Architect Approval (if applicable)
- **Action**: Design and specification compliance verified
- **Responsibility**: Architect
- **System Entry**: Approval details recorded
- **Data Captured**:
  - Date given to Architect
  - Name of Architect
  - Approval status

### Site In-charge Approval
- **Action**: Final site-level verification and approval
- **Responsibility**: Site In-charge
- **System Entry**: Approval details recorded
- **Data Captured**:
  - Date given to Site In-charge
  - Name of Site In-charge
  - Approval status
  - Remarks

## 6. PIMO Processing Phase
### Site to PIMO Dispatch
- **Action**: Approved documentation sent to PIMO
- **Responsibility**: Site Office
- **System Entry**: Dispatch details recorded
- **Data Captured**:
  - Date prepared for dispatch
  - Name of site office staff
  - Status (accept/reject/hold/issue)
  - Date sent to PIMO
  - Courier details

### PIMO Reception
- **Action**: Documentation received at PIMO
- **Responsibility**: PIMO Staff
- **System Entry**: Receipt details recorded
- **Data Captured**:
  - Date received at PIMO
  - Name of PIMO staff who received

### QS Mumbai Review
- **Action**: Secondary QS review at regional level
- **Responsibility**: QS Mumbai
- **System Entry**: Review details recorded
- **Data Captured**:
  - Date given to QS Mumbai
  - Name of QS
  - Date returned to PIMO
  - Name of PIMO person

## 7. Specialized Department Review (if applicable)
### IT Department Review (for IT bills)
- **Action**: Specialized review of IT purchases/services
- **Responsibility**: IT Department
- **System Entry**: Review details recorded
- **Data Captured**:
  - Date given to IT Department
  - Name of IT personnel
  - SES (Service Entry Sheet) details
  - Date returned

### PIMO Mumbai SES Processing
- **Action**: Service Entry Sheet created for services
- **Responsibility**: PIMO Mumbai
- **System Entry**: SES details recorded
- **Data Captured**:
  - SES number
  - SES date
  - SES amount
  - Processing details

## 8. Management Approval Phase
### Director/Advisor/Trustee Approval
- **Action**: High-level approval for payment
- **Responsibility**: Directors, Advisors, Trustees
- **System Entry**: Approval details recorded
- **Data Captured**:
  - Date given for approval
  - Approval dates by each authority
  - Date received back at PIMO
  - Remarks

## 9. Accounts Processing Phase
### Transfer to SVKM Accounts
- **Action**: Documentation sent to accounts department
- **Responsibility**: PIMO Mumbai
- **System Entry**: Transfer details recorded
- **Data Captured**:
  - Date given to accounts
  - Name of PIMO staff who transferred
  - PIMO remarks

### Accounts Department Reception
- **Action**: Documentation received by accounts
- **Responsibility**: SVKM Accounts
- **System Entry**: Receipt details recorded
- **Data Captured**:
  - Date received in accounts

### Query Resolution (if needed)
- **Action**: Queries returned to PIMO for resolution
- **Responsibility**: SVKM Accounts/PIMO
- **System Entry**: Query details recorded
- **Data Captured**:
  - Date returned to PIMO
  - Nature of query (in remarks)
  - Date received back after resolution

### Invoice Booking
- **Action**: Invoice formally entered into accounting system
- **Responsibility**: SVKM Accounts
- **System Entry**: Booking details recorded
- **Data Captured**:
  - Booking reference

## 10. Payment Processing Phase
### Payment Instruction
- **Action**: Payment approval from MC members
- **Responsibility**: Management Committee
- **System Entry**: Approval details recorded
- **Data Captured**:
  - Approval status (checkbox)
  - Payment remarks

### Payment Execution
- **Action**: Payment processed through banking system
- **Responsibility**: SVKM Accounts
- **System Entry**: Payment details recorded
- **Data Captured**:
  - F110 Identification (payment run)
  - Payment date
  - Accounts identification
  - Payment amount
  - Payment remarks
  - Status (Paid/UnPaid - auto-generated)

## 11. Filing Phase
### Bill Filing
- **Action**: Completed documentation filed for record-keeping
- **Responsibility**: SVKM Accounts
- **System Entry**: Filing status updated
- **Data Captured**:
  - Filing date
  - Filing reference

## Data Entry and Access Controls

### Field Format Controls
- **Numeric Fields**: Properly formatted (6-digit vendor codes, 10-digit PO numbers)
- **Date Fields**: Calendar-based entry for consistent formatting
- **Decimal Values**: Two-decimal precision for all monetary amounts
- **Dropdown Fields**: Controlled vocabularies from master lists

### Role-Based Access Controls
1. **Site Level Users**: 
   - Primary data entry for goods receipt, invoice details
   - Limited approval authority
   - Can view site-related transactions

2. **QS Team**: 
   - Measurement verification authority
   - Certification of payment capabilities
   - Access to measurement and quantification fields

3. **PIMO Team**: 
   - Document routing and tracking
   - Status updates and coordination
   - Visibility across the entire process

4. **Management**: 
   - Approval authorities
   - Dashboard view of process status
   - Historical transaction access

5. **Accounts Team**: 
   - Payment processing authority
   - Financial verification capabilities
   - System-wide reporting access

## Process Enforcement Controls
- **Sequential Processing**: System enforces workflow sequence
- **Mandatory Fields**: Required information at each stage
- **Timestamp Tracking**: All actions logged with date/time and user
- **Status Visibility**: Current status visible to all authorized users
- **Audit Trail**: Complete history of all transactions maintained

## Key Performance Indicators
- **Processing Time**: Days from receipt to payment
- **Query Rate**: Percentage of invoices with queries
- **First-Time Approval**: Percentage approved without returns
- **Payment Cycle**: Average days to payment
- **Compliance Rate**: Adherence to approval hierarchy