import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import Bill from '../models/bill-model.js';
import NatureOfWorkMaster from '../models/nature-of-work-master-model.js';
import CurrencyMaster from '../models/currency-master-model.js';
import PanStatusMaster from '../models/pan-status-master-model.js';
import ComplianceMaster from '../models/compliance-master-model.js';
import RegionMaster from '../models/region-master-model.js';

/**
 * Reads an Excel file, skips the first row (report header), and logs each data row.
 * @param {string} filePath - Path to the Excel file.
 */
export async function extractPatchRowsFromExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  // Find the first row with actual headers (skip report header)
  let headerRowIdx = 1;
  let headers = [];
  worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
    headers.push(cell.value?.toString().trim());
  });
  // If the first cell is a report header, skip to the next row
  if (headers[0]?.toLowerCase().includes('report generated')) {
    headerRowIdx++;
    headers = [];
    worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
      headers.push(cell.value?.toString().trim());
    });
  }

  // Process each data row after the header
  for (let rowNumber = headerRowIdx + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.getCell(1).value) continue;
    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      rowData[header] = cell.value;
    });
    // Print the extracted data for this row
    console.log('[PATCH EXTRACT] Data row:', rowData);
  }
}

// Map Excel headers to DB fields
const headerToDbField = {
  'Sr no': 'srNo',
  'Type of inv': 'natureOfWork', // Will be mapped to ObjectId
  'Region': 'region',
  'Project Description': 'projectDescription',
  'Vendor no': 'vendorNo',
  'Vendor Name': 'vendorName',
  'GST Number': 'gstNumber',
  '206AB Compliance': 'compliance206AB',
  'PAN Status': 'panStatus',
  'PO no': 'poNo',
  'PO Amt': 'poAmt',
  'Tax Inv no': 'taxInvNo',
  'Currency': 'currency',
  'Tax Inv Amt': 'taxInvAmt',
  'Remarks related to Inv': 'remarksBySiteTeam',
  'Status': 'status',
  'Tax Inv Dt': 'taxInvDate',
  'If PO created??': 'poCreated',
};

function isFilled(val) {
  return val !== undefined && val !== null && val !== '';
}

function parseDateIfNeeded(field, value) {
  // Only parse if the field is a date field and value is a string
  if (!value || typeof value !== 'string') return value;
  const dateFields = ['taxInvDate', 'poDate', 'advanceDate', 'proformaInvDate'];
  if (dateFields.includes(field)) {
    // Try to parse DD-MM-YYYY
    const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      const [_, day, month, year] = match;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    // Try to parse YYYY-MM-DD
    if (!isNaN(Date.parse(value))) {
      return new Date(value);
    }
  }
  return value;
}

function parseNumberIfNeeded(field, value) {
  const numberFields = ['poAmt', 'taxInvAmt'];
  if (numberFields.includes(field) && typeof value === 'string') {
    // Remove commas and parse as float
    const cleaned = value.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? value : num;
  }
  return value;
}

async function mapReferenceIfNeeded(field, value) {
  // Generic handler for all known reference fields
  if (!value || typeof value !== 'string') return value;
  if (field === 'currency') {
    const doc = await CurrencyMaster.findOne({ currency: { $regex: new RegExp(`^${value}$`, 'i') } });
    if (doc) return doc._id;
    return undefined;
  }
  if (field === 'panStatus') {
    const doc = await PanStatusMaster.findOne({ panStatus: { $regex: new RegExp(`^${value}$`, 'i') } });
    if (doc) return doc._id;
    return undefined;
  }
  if (field === 'compliance206AB') {
    const doc = await ComplianceMaster.findOne({ compliance206AB: { $regex: new RegExp(`^${value}$`, 'i') } });
    if (doc) return doc._id;
    return undefined;
  }
  if (field === 'region') {
    const doc = await RegionMaster.findOne({ name: { $regex: new RegExp(`^${value}$`, 'i') } });
    if (doc) return doc.name;
    return undefined;
  }
  return value;
}

// Define team field restrictions
const teamFieldRestrictions = {
  "QS Team": [
    "copDetails.date",
    "copDetails.amount"
  ],
  "Site Team": [
    "migoDetails.number",
    "migoDetails.date",
    "migoDetails.amount"
  ],
  "PIMO & MIGO/SES Team": [
    "sesDetails.number",
    "sesDetails.amount",
    "sesDetails.date"
  ],
  "Accounts Team": [
    "accountsDept.f110Identification",
    "accountsDept.paymentDate",
    "accountsDept.hardCopy",
    "accountsDept.accountsIdentification",
    "accountsDept.paymentAmt",
    "miroDetails.number",
    "miroDetails.date",
    "miroDetails.amount"
  ]
};

// Map Excel header names to their corresponding DB fields for specialized updates
const specialFieldsMap = {
  // QS Team fields
  'COP Dt': 'copDetails.date',
  'COP Amt': 'copDetails.amount',
  
  // Site Team fields
  'MIGO no': 'migoDetails.number',
  'MIGO Dt': 'migoDetails.date',
  'MIGO Amt': 'migoDetails.amount',
  
  // PIMO & MIGO/SES Team fields
  'SES no': 'sesDetails.number',
  'SES Amt': 'sesDetails.amount',
  'SES Dt': 'sesDetails.date',
  
  // Accounts Team fields
  'F110 Identification': 'accountsDept.f110Identification',
  'Dt of Payment': 'accountsDept.paymentDate',
  'Hard Copy': 'accountsDept.hardCopy',
  'Accts Identification': 'accountsDept.accountsIdentification',
  'Payment Amt': 'accountsDept.paymentAmt',
  'MIRO no': 'miroDetails.number',
  'MIRO Dt': 'miroDetails.date',
  'MIRO Amt': 'miroDetails.amount'
};

export async function patchBillsFromExcelFile(filePath, teamName = null) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  // Find the first row with actual headers (skip report header)
  let headerRowIdx = 1;
  let headers = [];
  worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
    headers.push(cell.value?.toString().trim());
  });
  if (headers[0]?.toLowerCase().includes('report generated')) {
    headerRowIdx++;
    headers = [];
    worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
      headers.push(cell.value?.toString().trim());
    });
  }

  let updated = 0, skipped = 0;
  let updateSummary = {};
  let ignoredFieldsCount = {};
  
  // Determine which fields are allowed based on team
  const allowedFields = teamName ? teamFieldRestrictions[teamName] : null;
  
  console.log(`[PATCH] Team: ${teamName || 'unrestricted'}, Allowed fields:`, allowedFields || 'all');

  for (let rowNumber = headerRowIdx + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.getCell(1).value) continue;
    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      rowData[header] = cell.value;
    });
    const srNo = rowData['Sr no'] ? String(rowData['Sr no']).trim() : null;
    if (!srNo) { skipped++; continue; }
    const bill = await Bill.findOne({ srNo });
    if (!bill) { skipped++; continue; }
    const updateObj = {};
    
    // Process standard field mappings first
    for (const [header, dbField] of Object.entries(headerToDbField)) {
      // Skip if not filled
      if (!isFilled(rowData[header])) continue;
      
      // If team restrictions are active, only allow specific updates
      // Other fields in Excel are allowed but won't be updated
      if (allowedFields && !allowedFields.includes(dbField)) {
        console.log(`[SKIPPING] Field ${dbField} is not in allowed list for team ${teamName}`);
        // Track ignored fields for reporting
        if (!ignoredFieldsCount[dbField]) {
          ignoredFieldsCount[dbField] = 0;
        }
        ignoredFieldsCount[dbField]++;
        continue; // We don't count these as "restricted" - they're just ignored
      }
      
      if (header === 'Type of inv') {
        // Special mapping to natureOfWork
        const typeVal = rowData[header];
        if (isFilled(typeVal)) {
          const workDoc = await NatureOfWorkMaster.findOne({ natureOfWork: { $regex: new RegExp(typeVal, 'i') } });
          if (workDoc) {
            updateObj['natureOfWork'] = workDoc._id;
          }
        }
        continue;
      }
      
      let val = rowData[header];
      val = parseDateIfNeeded(dbField, val);
      val = parseNumberIfNeeded(dbField, val);
      // Generic reference mapping for all known reference fields
      if (['currency','panStatus','compliance206AB','region'].includes(dbField)) {
        val = await mapReferenceIfNeeded(dbField, val);
        if (val === undefined) continue; // skip update if mapping fails
      }
      updateObj[dbField] = val;
    }
    
    // Process special team-specific fields (nested fields)
    for (const [header, dbField] of Object.entries(specialFieldsMap)) {
      if (!isFilled(rowData[header])) continue;
      
      // Skip if this field is not allowed for the specified team
      // But don't count as restricted - just quietly ignore it
      if (allowedFields && !allowedFields.includes(dbField)) {
        console.log(`[SKIPPING] Field ${dbField} is not in allowed list for team ${teamName}`);
        // Track ignored fields for reporting
        if (!ignoredFieldsCount[dbField]) {
          ignoredFieldsCount[dbField] = 0;
        }
        ignoredFieldsCount[dbField]++;
        continue;
      }
      
      // Get the value and parse it appropriately
      let val = rowData[header];
      
      // Handle date fields
      if (dbField.includes('.date') || dbField.includes('Dt')) {
        val = parseDateIfNeeded(dbField, val);
      }
      
      // Handle numeric fields
      if (dbField.includes('.amount') || dbField.includes('Amt')) {
        val = parseNumberIfNeeded(dbField, val);
      }
      
      // Set the nested field in the update object
      const fieldParts = dbField.split('.');
      if (fieldParts.length === 2) {
        // Handle nested fields
        if (!updateObj[fieldParts[0]]) {
          updateObj[fieldParts[0]] = {};
        }
        updateObj[fieldParts[0]][fieldParts[1]] = val;
      } else {
        // Handle regular fields
        updateObj[dbField] = val;
      }
      
      // Track which fields are being updated
      if (!updateSummary[dbField]) {
        updateSummary[dbField] = 0;
      }
      updateSummary[dbField]++;
    }
    
    // Never nullify: only update fields that are filled in Excel
    if (Object.keys(updateObj).length > 0) {
      await Bill.updateOne({ _id: bill._id }, { $set: updateObj });
      updated++;
      console.log(`[PATCHED] Bill srNo ${srNo} updated fields:`, updateObj);
    } else {
      skipped++;
    }
  }
  // Count total ignored field updates
  const totalIgnoredUpdates = Object.values(ignoredFieldsCount).reduce((sum, count) => sum + count, 0);
  
  console.log(`[PATCH SUMMARY] Updated: ${updated}, Skipped: ${skipped}, Ignored fields: ${Object.keys(ignoredFieldsCount).length}, Ignored updates: ${totalIgnoredUpdates}`);
  
  return { 
    updated, 
    skipped,
    teamName,
    fieldUpdateSummary: updateSummary,
    ignoredFields: {
      count: Object.keys(ignoredFieldsCount).length,
      totalUpdatesIgnored: totalIgnoredUpdates,
      fields: ignoredFieldsCount
    },
    teamRestrictions: {
      active: !!teamName,
      allowedFields: allowedFields || 'all fields'
    }
  };
}
