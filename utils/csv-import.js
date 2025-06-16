import ExcelJS from 'exceljs';
import Bill from "../models/bill-model.js";
import mongoose from "mongoose";
import PanStatusMaster from "../models/pan-status-master-model.js";
import CurrencyMaster from "../models/currency-master-model.js";
import RegionMaster from "../models/region-master-model.js";
import NatureOfWorkMaster from "../models/nature-of-work-master-model.js";
import VendorMaster from "../models/vendor-master-model.js";
import ComplianceMaster from "../models/compliance-master-model.js";

// Import helper functions from csv-patch.js
import {
  headerMapping,
} from './headerMap.js';
import {
  parseDate,
  convertTypes,
  validateRequiredFields,
  contextBasedMapping,
} from './csv-patch.js';

const unflattenData = (data) => {
  const result = {};
  for (const key in data) {
    const keys = key.split('.');
    keys.reduce((acc, part, index) => {
      if (index === keys.length - 1) {
        acc[part] = data[key];
      } else {
        acc[part] = acc[part] || {};
      }
      return acc[part];
    }, result);
  }
  return result;
};
const mergeWithExisting = (existingData, newData) => {
  // First organize QS fields in the new data to ensure proper structure
  organizeQSFields(newData);
  
  // Deep merge with special handling for null/undefined values
  const deepMerge = (existing, updates) => {
    if (!existing) return updates;
    if (!updates) return existing;
    
    // Create a copy of the existing data as our result
    const result = { ...existing };
    
    // Process each key in the updates
    Object.keys(updates).forEach(key => {
      const existingValue = existing[key];
      const newValue = updates[key];
      
      // Special handling for GST Number field
      if (key === 'gstNumber') {
        // Check if the new value is a placeholder GST value
        const isPlaceholderGST = !newValue || 
          newValue === '' || 
          newValue === 'NOTPROVIDED' || 
          newValue === 'NOT PROVIDED' || 
          newValue === 'NotProvided' || 
          newValue === 'Not Provided' || 
          newValue === 'N/A' || 
          newValue === 'NA';
          
        // Check if existing value looks like a valid GST (15 chars)
        const hasValidExistingGST = existingValue && 
          typeof existingValue === 'string' && 
          existingValue.length === 15 &&
          !['NOTPROVIDED', 'NOT PROVIDED', 'NotProvided', 'Not Provided'].includes(existingValue);
          
        if (isPlaceholderGST && hasValidExistingGST) {
          // Keep the existing valid GST number instead of overwriting with placeholder
          return; // Skip this update
        }
      }
      
      // Check if the new value is a placeholder or empty value
      const isPlaceholderValue = 
        newValue === null || 
        newValue === undefined || 
        newValue === '' || 
        newValue === 'Not Provided' || 
        newValue === 'Not provided' || 
        newValue === 'not provided' ||
        newValue === 'N/A' ||
        newValue === 'n/a';
      
      // Case 1: New value is null/undefined/empty string/placeholder - don't overwrite existing data
      if (isPlaceholderValue) {
        // Keep existing value
      }
      // Case 2: Both are objects (but not Date) - recursive merge
      else if (
        existingValue && 
        typeof existingValue === 'object' && 
        !(existingValue instanceof Date) &&
        typeof newValue === 'object' && 
        !(newValue instanceof Date)
      ) {
        result[key] = deepMerge(existingValue, newValue);
      }
      // Case 3: New value exists - use it
      else {
        result[key] = newValue;
      }
    });
    
    return result;
  };

  // Perform the deep merge
  return deepMerge(existingData, newData);
};
// Cache for master data to avoid repeated queries
class MasterDataCache {
  constructor() {
    this.regions = null;
    this.currencies = null;
    this.natureOfWork = null;
    this.panStatuses = null;
    this.vendors = null;
    this.compliance = null;
    this.defaults = {};
  }

  async initialize() {
    // Fetch all master data in parallel
    const [regions, currencies, natureOfWork, panStatuses, vendors, compliance] = await Promise.all([
      RegionMaster.find().lean(),
      CurrencyMaster.find().lean(),
      NatureOfWorkMaster.find().lean(),
      PanStatusMaster.find().lean(),
      VendorMaster.find().lean(),
      ComplianceMaster.find().lean()
    ]);

    this.regions = regions;
    this.currencies = currencies;
    this.natureOfWork = natureOfWork;
    this.panStatuses = panStatuses;
    this.vendors = vendors;
    this.compliance = compliance;

    // Set defaults
    this.defaults = {
      region: regions[0] || null,
      currency: currencies.find(c => c.currency?.toLowerCase() === "inr") || currencies[0] || null,
      natureOfWork: natureOfWork.find(n => n.natureOfWork?.toLowerCase() === "others") || natureOfWork[0] || null
    };

    // Validate essential master data
    this.validateMasterData();
  }

  validateMasterData() {
    if (!this.defaults.region) {
      throw new Error("No regions found in RegionMaster. Please add at least one region before importing.");
    }
    if (!this.defaults.currency) {
      throw new Error("No currencies found in CurrencyMaster. Please add at least one currency before importing.");
    }
    if (!this.defaults.natureOfWork) {
      throw new Error("No nature of work entries found in NatureOfWorkMaster. Please add at least one entry before importing.");
    }
  }

  findRegion(regionName) {
    if (!regionName) return this.defaults.region.name;
    const region = this.regions.find(r => 
      r.name && r.name.toLowerCase() === regionName.toLowerCase()
    );
    return region ? region.name : null;
  }

  findCurrency(currencyName) {
    if (!currencyName) return this.defaults.currency._id;
    const currency = this.currencies.find(c => 
      c.currency && c.currency.toLowerCase() === currencyName.toLowerCase()
    );
    return currency ? currency._id : this.defaults.currency._id;
  }

  findNatureOfWork(workType) {
    if (!workType) return this.defaults.natureOfWork._id;
    // Clean up input for matching
    const cleanedInput = typeof workType === 'string' ? workType.trim().toLowerCase() : '';
     //console.log('[NatureOfWork]',' Cleaned:', cleanedInput);
    // // Log all master values
     //console.log('[NatureOfWork] Master values:', this.natureOfWork.map(n => ({ name: n.natureOfWork, id: n._id })));
    // 1. Try exact match (ignoring case and spaces)
    let nature = this.natureOfWork.find(n => {
      const cleanedMaster = n.natureOfWork.trim().toLowerCase();
      //console.log('[NatureOfWork] Comparing (exact):', cleanedInput, '===', cleanedMaster);
      return n.natureOfWork && cleanedMaster === cleanedInput;
    });
    if (nature) {
      //console.log('[NatureOfWork] Exact match found:', nature);
      return nature._id;
    }
    // 2. Try partial match (input in master or master in input)
    nature = this.natureOfWork.find(n => {
      const cleanedMaster = n.natureOfWork.trim().toLowerCase();
      const partial = cleanedMaster.includes(cleanedInput) || cleanedInput.includes(cleanedMaster);
      if (partial) {
        console.log('[NatureOfWork] Partial match found:', cleanedInput, '<->', cleanedMaster, n);
      }
      return n.natureOfWork && partial;
    });
    if (nature) return nature._id;
    console.log('[NatureOfWork] No match found, defaulting to Others');
    return this.defaults.natureOfWork._id;
  }

  findVendor(vendorName, vendorNo) {
    if (vendorName) {
      const vendor = this.vendors.find(v => 
        v.vendorName && v.vendorName.toLowerCase().includes(vendorName.toLowerCase())
      );
      if (vendor) return vendor._id;
    }
    
    if (vendorNo) {
      const vendor = this.vendors.find(v => v.vendorNo === vendorNo);
      if (vendor) return vendor._id;
    }
    
    return new mongoose.Types.ObjectId();
  }

  findPanStatus(panStatusName) {
    if (!panStatusName) return null;
    const panStatus = this.panStatuses.find(p => 
      p.name && p.name.toLowerCase() === panStatusName.toLowerCase()
    );
    return panStatus ? panStatus._id : null;
  }

  async findCompliance(complianceName) {
    if (!complianceName) return null;
    const compliance = this.compliance.find(c => 
      c.compliance206AB && c.compliance206AB.toLowerCase().includes(complianceName.toLowerCase())
    );
    return compliance ? compliance._id : null;
  }
}

// Helper function to find existing bills by srNo or excelSrNo
async function findExistingBills(srNosToCheck) {
  if (!srNosToCheck?.length) return {};
  
  const existingBills = await Bill.find({
    $or: [
      { srNo: { $in: srNosToCheck } },
      { excelSrNo: { $in: srNosToCheck } }
    ]
  }).lean();
  
  const billsByIdentifier = {};
  existingBills.forEach(bill => {
    if (bill.srNo) billsByIdentifier[bill.srNo] = bill;
    if (bill.excelSrNo && bill.excelSrNo !== bill.srNo) {
      billsByIdentifier[bill.excelSrNo] = bill;
    }
  });
  
  return billsByIdentifier;
}

// Validate vendor against allowed list
function isValidVendor(vendorName, validVendorNos) {
  if (!vendorName || !validVendorNos?.length) return true;
  
  return validVendorNos.some(validVendor => 
    vendorName.toLowerCase().includes(validVendor.toLowerCase()) || 
    validVendor.toLowerCase().includes(vendorName.toLowerCase())
  );
}

// Process date fields in data object
function processDateFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const dateFields = [
    'billDate', 'poDate', 'proformaInvDate', 'proformaInvRecdAtSite', 
    'taxInvDate', 'taxInvRecdAtSite', 'advanceDate'
  ];
  
  // Process top-level date fields
  dateFields.forEach(field => {
    if (obj[field]) obj[field] = formatDate(obj[field]);
  });
  
  // Process nested date fields
  if (obj.accountsDept) {
    const accountsDateFields = [
      'dateGiven', 'dateReceived', 'returnedToPimo', 'receivedBack', 
      'paymentDate', 'invBookingChecking'
    ];
    accountsDateFields.forEach(field => {
      if (obj.accountsDept[field]) {
        obj.accountsDept[field] = formatDate(obj.accountsDept[field]);
      }
    });
  }
  
  // Process other nested objects with dates
  const nestedObjects = [
    'qualityEngineer', 'qsInspection', 'qsMeasurementCheck', 'vendorFinalInv', 
    'qsCOP', 'siteEngineer', 'architect', 'siteIncharge', 'siteOfficeDispatch',
    'qsMumbai', 'pimoMumbai', 'itDept', 'copDetails', 'migoDetails', 'sesDetails'
  ];
  
  nestedObjects.forEach(nestedField => {
    if (obj[nestedField]) {
      ['dateGiven', 'dateReceived', 'date'].forEach(dateField => {
        if (obj[nestedField][dateField]) {
          obj[nestedField][dateField] = formatDate(obj[nestedField][dateField]);
        }
      });
    }
  });
  
  // Special handling for approval details
  if (obj.approvalDetails?.directorApproval) {
    ['dateGiven', 'dateReceived'].forEach(field => {
      if (obj.approvalDetails.directorApproval[field]) {
        obj.approvalDetails.directorApproval[field] = formatDate(obj.approvalDetails.directorApproval[field]);
      }
    });
  }
  
  return obj;
}

// Standardize date format
function formatDate(date) {
  if (!date) return null;
  if (typeof date === 'string') return parseDate(date);
  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  }
  return null;
}

// Ensure valid ObjectId
function ensureValidObjectId(value, defaultValue) {
  try {
    if (!value) return defaultValue;
    if (value instanceof mongoose.Types.ObjectId) return value;
    if (typeof value === 'string') return new mongoose.Types.ObjectId(value);
    return defaultValue;
  } catch (error) {
    console.error('Error converting to ObjectId:', error);
    return defaultValue;
  }
}

// Process row data with master data lookups
async function processRowData(rowData, masterCache, validVendorNos, isUpdate = false, existingBill = null) {
  const { srNo, vendorNo, vendorName } = rowData;
  
  // Validate vendor if required
  if (!isValidVendor(vendorName, validVendorNos)) {
    throw new Error('Vendor not found in database');
  }
  
  // Set basic fields
  if (!isUpdate) {
    rowData.billDate = rowData.taxInvDate || new Date();
    rowData.amount = rowData.taxInvAmt || 0;
    rowData.srNoOld = srNo;
    rowData.excelSrNo = srNo;
  }
  console.log("Invoice : " , rowData.typeOfInv);
  // Map master data references
  rowData.vendor = masterCache.findVendor(vendorName, vendorNo);
  rowData.panStatus = masterCache.findPanStatus(rowData.panStatus);
  rowData.currency = masterCache.findCurrency(rowData.currency);
  rowData.natureOfWork = masterCache.findNatureOfWork(rowData.typeOfInv);
  
  // Handle region (required field)
  const regionName = masterCache.findRegion(rowData.region);
  if (!regionName) {
    throw new Error('Region not found in RegionMaster');
  }
  rowData.region = regionName;
  
  // Handle compliance
  if (rowData.compliance206AB) {
    rowData.compliance206AB = await masterCache.findCompliance(rowData.compliance206AB);
  }
  
  // Set default required fields
  const defaults = {
    siteStatus: "hold",
    department: "DEFAULT DEPT",
    taxInvRecdBy: "SYSTEM IMPORT",
    taxInvRecdAtSite: new Date(),
    projectDescription: "N/A",
    poCreated: "No",
    vendorName: vendorName || "Unknown Vendor",
    vendorNo: vendorNo || "Unknown"
  };
  
  Object.entries(defaults).forEach(([key, value]) => {
    if (!rowData[key]) rowData[key] = value;
  });
  
  return rowData;
}

// Process Excel worksheet headers
function processHeaders(worksheet) {
  // Get headers from the second row (first row might be column numbers)
  const firstRowValues = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, cell => {
    firstRowValues.push(cell.value?.toString().trim());
  });
  
  const isFirstRowNumbers = firstRowValues.every(val => !isNaN(parseInt(val)));
  const headerRowIndex = isFirstRowNumbers ? 2 : 1;
  
  const headers = [];
  const headerPositions = {};
  
  worksheet.getRow(headerRowIndex).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const headerText = cell.value?.toString().trim();
    headers[colNumber - 1] = headerText;
    headerPositions[headerText] = colNumber - 1;
  });
  
  // Create position to field mapping for context-based mapping
  const positionToFieldMap = {};
  Object.entries(contextBasedMapping).forEach(([contextHeader, config]) => {
    if (headerPositions[contextHeader] !== undefined) {
      const contextPosition = headerPositions[contextHeader];
      const nextPosition = contextPosition + 1;
      if (headers[nextPosition] === config.nextField) {
        positionToFieldMap[nextPosition] = config.mapping;
      }
    }
  });
  
  return { headers, headerPositions, positionToFieldMap, headerRowIndex };
}

// Extract row data from Excel row
function extractRowData(row, headers, positionToFieldMap, headerPositions) {
  const rawRowData = {};
  let srNo = null;
  let vendorNo = null;
  let vendorName = null;
  
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const columnIndex = colNumber - 1;
    const header = headers[columnIndex];
    if (!header) return;
    
    // Determine field mapping
    let fieldName;
    if (positionToFieldMap[columnIndex]) {
      fieldName = positionToFieldMap[columnIndex];
    } else {
      fieldName = headerMapping[header] || header;
    }
    
    // Handle duplicate Status field mappings
    if (fieldName === "status" && header === "Status" && 
        columnIndex !== headerPositions["Status"]) {
      fieldName = "accountsDept.status";
    }
    
    let value = cell.value;
    
    // Store key identifiers
    if (fieldName === 'srNo') srNo = String(value || '').trim();
    if (fieldName === 'vendorNo') vendorNo = String(value || '').trim();
    if (fieldName === 'vendorName') vendorName = String(value || '').trim();
    
    // Handle different cell types
    if (cell.type === ExcelJS.ValueType.Date) {
      value = cell.value;
    } else if (typeof value === 'object' && value !== null) {
      value = value.text || value.result || value.toString();
    }
    
    // Parse date fields
    if (fieldName?.toLowerCase().includes('date')) {
      value = parseDate(value);
    }
    
    rawRowData[fieldName] = value;
  });
  
  return { rawRowData, srNo, vendorNo, vendorName };
}

// Main Excel import function
export const importBillsFromExcel = async (filePath, validVendorNos = [], patchOnly = false) => {
  try {

    // Initialize master data cache
    const masterCache = new MasterDataCache();
    await masterCache.initialize();
    
    // Load Excel workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error("No worksheet found in the Excel file");
    }
    
    // Process headers
    const { headers, headerPositions, positionToFieldMap, headerRowIndex } = processHeaders(worksheet);
    
    // Collect all serial numbers for batch lookup
    const srNosInExcel = [];
    for (let rowNumber = headerRowIndex + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const srNoCell = row.getCell(1);
      if (srNoCell.value) {
        srNosInExcel.push(String(srNoCell.value).trim());
      }
    }
    
    // Batch lookup of existing bills
    const existingBillsMap = await findExistingBills(srNosInExcel);
    
    // Processing results
    const results = {
      toInsert: [],
      toUpdate: [],
      alreadyExistingBills: [],
      nonExistentVendors: []
    };
    
    // Process each row
    for (let rowNumber = headerRowIndex + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Skip rows with no value in first cell
      if (!row.getCell(1).value) continue;
      
      try {
        const { rawRowData, srNo, vendorNo, vendorName } = extractRowData(
          row, headers, positionToFieldMap, headerPositions
        );
        
        if (!srNo) continue;
        
        const existingBill = existingBillsMap[srNo];
        
        if (existingBill) {
          if (patchOnly) {
            // Process for update
            const processedData = await processRowData(
              { ...rawRowData }, masterCache, validVendorNos, true, existingBill
            );
            
            const typedData = convertTypes(processedData);
            const validatedData = await validateRequiredFields(typedData);
            
            processDateFields(validatedData);
            const mergedData = mergeWithExisting(existingBill, validatedData);
            const unflattenedData = unflattenData(mergedData);
            processDateFields(unflattenedData);
            
            // Ensure required fields
            ensureRequiredFields(unflattenedData, existingBill, masterCache);
            
            results.toUpdate.push({ _id: existingBill._id, data: unflattenedData });
            results.alreadyExistingBills.push({
              srNo, _id: existingBill._id, vendorName, rowNumber, updating: true
            });
          } else {
            // Just track as existing
            results.alreadyExistingBills.push({
              srNo, _id: existingBill._id, vendorName, rowNumber
            });
          }
        } else if (!patchOnly) {
          // Process new bill
          const processedData = await processRowData(
            { ...rawRowData }, masterCache, validVendorNos, false
          );
          
          const typedData = convertTypes(processedData);
          const validatedData = await validateRequiredFields(typedData);
          
          processDateFields(validatedData);
          const unflattenedData = unflattenData(validatedData);
          processDateFields(unflattenedData);
          
          // Ensure required fields
          ensureRequiredFields(unflattenedData, null, masterCache);
          
          // Log natureOfWork value and type before saving
          console.log('[DEBUG] About to insert bill. natureOfWork:', unflattenedData.natureOfWork, 'Type:', typeof unflattenedData.natureOfWork);
          results.toInsert.push({ ...unflattenedData, _importMode: true });
        } else {
          results.nonExistentVendors.push({
            srNo, vendorNo, vendorName, rowNumber,
            reason: 'Bill does not exist in patchOnly mode'
          });
        }
      } catch (error) {
        results.nonExistentVendors.push({
          srNo: row.getCell(1).value?.toString().trim(),
          vendorNo: row.getCell(2)?.value?.toString().trim(),
          vendorName: row.getCell(3)?.value?.toString().trim(),
          rowNumber,
          reason: error.message
        });
      }
    }
    
    // Execute database operations
    const insertCount = await insertBills(results.toInsert);
    const updateCount = await updateBills(results.toUpdate);
    
    return {
      inserted: insertCount,
      updated: updateCount,
      skipped: results.alreadyExistingBills.length,
      nonExistentVendors: results.nonExistentVendors
    };
    
  } catch (error) {
    console.error('Excel import error:', error);
    throw error;
  }
};

// Ensure required fields are present
function ensureRequiredFields(data, existingBill, masterCache) {
  const requiredFields = {
    region: existingBill?.region || masterCache.defaults.region.name,
    currency: existingBill?.currency || masterCache.defaults.currency._id,
    //natureOfWork: existingBill?.natureOfWork || masterCache.defaults.natureOfWork._id,
    vendor: existingBill?.vendor || new mongoose.Types.ObjectId(),
    billDate: existingBill?.billDate || new Date(),
    amount: existingBill?.amount || 0,
    vendorName: existingBill?.vendorName || "Unknown Vendor",
    vendorNo: existingBill?.vendorNo || "Unknown",
    projectDescription: existingBill?.projectDescription || "N/A",
    poCreated: existingBill?.poCreated || "No",
    siteStatus: existingBill?.siteStatus || "hold",
    department: existingBill?.department || "DEFAULT DEPT",
    taxInvRecdBy: existingBill?.taxInvRecdBy || "SYSTEM IMPORT",
    taxInvRecdAtSite: existingBill?.taxInvRecdAtSite || new Date()
  };
  
  Object.entries(requiredFields).forEach(([key, defaultValue]) => {
    if (!data[key]) data[key] = defaultValue;
  });
  

  
  if (data.panStatus) {
    data.panStatus = ensureValidObjectId(data.panStatus, null);
  }
  
  if (data.compliance206AB) {
    data.compliance206AB = ensureValidObjectId(data.compliance206AB, null);
  }
}

// Insert bills in batch
async function insertBills(bills) {
  if (!bills.length) return 0;
  
  try {
    const inserted = await Bill.insertMany(bills, { validateBeforeSave: false });
    return inserted.length;
  } catch (error) {
    if (error.name === 'ValidationError' && error.errors) {
      const fieldErrors = Object.keys(error.errors).map(field => 
        `Field '${field}': ${error.errors[field].message}`
      ).join('; ');
      throw new Error(`Bill validation failed: ${fieldErrors}`);
    }
    throw new Error(`Error inserting new bills: ${error.message}`);
  }
}

// Update bills in batch
async function updateBills(updates) {
  if (!updates.length) return 0;
  
  try {
    let updateCount = 0;
    for (const { _id, data } of updates) {
      await Bill.findByIdAndUpdate(_id, { ...data, _importMode: true }, {
        new: true,
        validateBeforeSave: false
      });
      updateCount++;
    }
    return updateCount;
  } catch (error) {
    if (error.name === 'ValidationError' && error.errors) {
      const fieldErrors = Object.keys(error.errors).map(field => 
        `Field '${field}': ${error.errors[field].message}`
      ).join('; ');
      throw new Error(`Bill update validation failed: ${fieldErrors}`);
    }
    throw new Error(`Error updating existing bills: ${error.message}`);
  }
}