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

export async function patchBillsFromExcelFile(filePath) {
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
    for (const [header, dbField] of Object.entries(headerToDbField)) {
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
      if (!isFilled(rowData[header])) continue;
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
    // Never nullify: only update fields that are filled in Excel
    if (Object.keys(updateObj).length > 0) {
      await Bill.updateOne({ _id: bill._id }, { $set: updateObj });
      updated++;
      console.log(`[PATCHED] Bill srNo ${srNo} updated fields:`, updateObj);
    } else {
      skipped++;
    }
  }
  console.log(`[PATCH SUMMARY] Updated: ${updated}, Skipped: ${skipped}`);
  return { updated, skipped };
}
