import Bill from '../models/bill-model.js';
import VendorMaster from '../models/vendor-master-model.js';

// helper for calculating eod
const endOfDay = (dateString) => {
  const date = new Date(dateString);
  date.setHours(23,59,59,999);
  return date;
}

/**
 * Generate Outstanding Bills Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getOutstandingBillsReport = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, vendor } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Bills that have been received by the accounting department
      "accountsDept.dateReceived": { $ne: null, $exists: true },
      // But have not been Paid yet - field based on actual schema
      "accountsDept.paymentDate": { $eq: null }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["taxInvDate"] = { 
        $gte: new Date(startDate), 
        $lte: endOfDay(endDate)
      };
    }
    
    // Add vendor filter if provided
    if (vendor) {
      filter["vendorName"] = vendor;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch outstanding bills from database, and populate vendor
    const outstandingBills = await Bill.find(filter)
      .sort({ "vendorName": 1, "taxInvDate": 1 })
      .populate('vendor');
    
    console.log(`Found ${outstandingBills.length} outstanding bills`);
    
    // Group bills by vendor name
    const vendorGroups = {};
    
    outstandingBills.forEach(bill => {
      // Use vendor name from populated vendor object
      const vendorName = bill.vendor?.vendorName || 'N/A';
      if (!vendorGroups[vendorName]) {
        vendorGroups[vendorName] = [];
      }
      vendorGroups[vendorName].push(bill);
    });
    
    // Sort vendor names alphabetically
    const sortedVendorNames = Object.keys(vendorGroups).sort();
    
    // Create the report data with grouped and sorted vendors
    let index = 1;
    let reportData = [];
    let totalInvoiceAmount = 0;
    let totalCopAmount = 0;
    let totalCount = 0;
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    sortedVendorNames.forEach(vendorName => {
      const vendorBills = vendorGroups[vendorName];
      let vendorSubtotal = 0;
      let vendorCopSubtotal = 0;
      const billCount = vendorBills.length;
      totalCount += billCount;
      
      // Sort bills within each vendor group by invoice date
      vendorBills.sort((a, b) => {
        if (a.taxInvDate && b.taxInvDate) {
          return new Date(a.taxInvDate) - new Date(b.taxInvDate);
        }
        return 0;
      });
      
      // Add vendor group object that will contain all vendor bills and subtotal
      const vendorGroup = {
        vendorName: vendorName,
        bills: [],
        subtotal: 0
      };
      
      // Add each bill to the vendor group
      vendorBills.forEach(bill => {
        const taxInvAmt = parseFloat(bill.taxInvAmt || bill.accountsDept?.paymentAmt || 0);
        const copAmt = parseFloat(bill.copDetails?.amount || 0);

        vendorSubtotal += !isNaN(taxInvAmt) ? taxInvAmt : 0;
        vendorCopSubtotal += !isNaN(copAmt) ? copAmt : 0;

        totalInvoiceAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
        totalCopAmount += !isNaN(copAmt) ? copAmt : 0;
        
        vendorGroup.bills.push({
          srNo: index++,
          region: bill.region || "N/A",
          vendorNo: bill.vendor?.vendorNo || "N/A",
          vendorName: bill.vendor?.vendorName || "N/A",
          taxInvNo: bill.taxInvNo || "N/A",
          taxInvDate: formatDate(bill.taxInvDate) || "N/A",
          taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
          copAmt: !isNaN(parseFloat(bill.copDetails?.amount)) ? 
            Number(parseFloat(bill.copDetails.amount).toFixed(2)) : 0,
          dateRecdInAcctsDept: formatDate(bill.accountsDept?.dateReceived) || "N/A",
          natureOfWorkSupply: bill.natureOfWork || "N/A"
        });
      });
      
      // Add the subtotal
      vendorGroup.subtotal = Number(vendorSubtotal.toFixed(2));
      vendorGroup.subtotalCopAmt = Number(vendorCopSubtotal.toFixed(2));
      
      // Add all bills from this vendor to the report data
      vendorGroup.bills.forEach(bill => reportData.push(bill));
      
      // Add subtotal row after each vendor's bills
      reportData.push({
        isSubtotal: true,
        vendorName: vendorName,
        subtotalLabel: `Subtotal for ${vendorName}:`,
        subtotalAmount: Number(vendorSubtotal.toFixed(2)),
        subtotalCopAmt: Number(vendorCopSubtotal.toFixed(2)),
        count: billCount
      });
    });
    
    // Add grand total row
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total:",
      grandTotalAmount: Number(totalInvoiceAmount.toFixed(2)),
      grandTotalCopAmt: Number(totalCopAmount.toFixed(2)),
      totalCount: totalCount
    });
    
    // Calculate vendor subtotals for summary section
    const vendorSubtotals = sortedVendorNames.map(vendorName => {
      const vendorBills = vendorGroups[vendorName];
      const totalAmount = vendorBills.reduce((sum, bill) => {
        const amount = parseFloat(bill.taxInvAmt || bill.accountsDept?.paymentAmt || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const totalCopAmount = vendorBills.reduce((sum, bill) => {  // Calculate total COP amount
        const copAmount = parseFloat(bill.copDetails?.amount || 0);
        return sum + (isNaN(copAmount) ? 0 : copAmount);
      }, 0);
      return { 
        vendorName, 
        totalAmount: Number(totalAmount.toFixed(2)),
        totalCopAmount: Number(totalCopAmount.toFixed(2)),
        count: vendorBills.length
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Outstanding Bills Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "date inv recd in accts dept is filled and date of payment is empty",
          sorting: ["vendorName", "invoiceDate"]
        },
        data: reportData,
        summary: {
          vendorSubtotals,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          totalCopAmount: Number(totalCopAmount.toFixed(2)),
          recordCount: reportData.length - sortedVendorNames.length - 1 // Subtract subtotal and grand total rows
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating outstanding bills report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Invoices Received at Site Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesReceivedAtSite = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Tax invoice received at site date should be filled
      "taxInvRecdAtSite": { $ne: null, $exists: true },
      // Sent to Mumbai should be blank
      "pimoMumbai.dateReceived": { $eq: null }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["taxInvRecdAtSite"] = { 
        $gte: new Date(startDate), 
        $lte: endOfDay(endDate) 
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by date received at site, and populate vendor
    const invoices = await Bill.find(filter)
      .sort({ "taxInvRecdAtSite": 1 })
      .populate('vendor');
    
    console.log(`Found ${invoices.length} invoices received at site but not sent to Mumbai`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalAmount = 0;
    const reportData = [];
    invoices.forEach((bill, idx) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt);
      if (!isNaN(taxInvAmt)) totalAmount += taxInvAmt;
      reportData.push({
        srNo: idx + 1,
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendor?.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtTaxInvRecdAtSite: formatDate(bill.taxInvRecdAtSite) || "N/A",
        poNo: bill.poNo || "N/A"
      });
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices received at site",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions"
        },
        sortingCriteria: [
          "Date Tax Invoice received at Site"
        ],
        filterLogic: "Date of tax invoice received at site should be filled AND Sent to Mumbai should be blank",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalAmount: Number(totalAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices received at site report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Invoices Courier to Mumbai Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesCourierToMumbai = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, nameSiteOffice } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Tax invoice received at site date should be filled
      "taxInvRecdAtSite": { $ne: null, $exists: true },
      // Sent to Mumbai should be filled
      "siteOfficeDispatch.dateGiven": { $ne: null, $exists: true }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["siteOfficeDispatch.dateGiven"] = { 
        $gte: new Date(startDate), 
        $lte: endOfDay(endDate)
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    // Add site office name filter if provided
    if (nameSiteOffice) {
      filter["siteOfficeDispatch.name"] = nameSiteOffice;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by sr no
    const invoices = await Bill.find(filter).sort({ "srNo": 1 }).populate('vendor');
    
    console.log(`Found ${invoices.length} invoices couriered to Mumbai`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalAmount = 0;
    const reportData = invoices.map((bill) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
      totalAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
      
      return {
        srNo: bill.srNo || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtTaxInvRecdAtSite: formatDate(bill.taxInvRecdAtSite) || "N/A",
        dtTaxInvCourierToMumbai: formatDate(bill.siteOfficeDispatch?.dateGiven) || "N/A",
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices courier to Mumbai",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions",
          nameSiteOffice: nameSiteOffice || "All site offices"
        },
        sortingCriteria: [
          "Sr No (Column 1)"
        ],
        filterLogic: "Dt of tax invoice recd at site should be filled AND Sent to mumbai should be filled",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalAmount: Number(totalAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices courier to Mumbai report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Invoices Received at Mumbai Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesReceivedAtMumbai = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Tax invoice received at Mumbai date should be filled
      "pimoMumbai.dateReceived": { $ne: null, $exists: true },
      // Not yet sent to accounts department
      "accountsDept.dateGiven": { $eq: null }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["pimoMumbai.dateReceived"] = { 
        $gte: new Date(startDate), 
        $lte: endOfDay(endDate)
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by sr no
    const invoices = await Bill.find(filter).sort({ "srNo": 1 }).populate('vendor');
    
    console.log(`Found ${invoices.length} invoices received at Mumbai but not sent to accounts department`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalAmount = 0;
    const reportData = invoices.map((bill) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
      totalAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
      
      return {
        srNo: bill.srNo || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtTaxInvRecdAtSite: formatDate(bill.taxInvRecdAtSite) || "N/A",
        dtTaxInvRecdAtMumbai: formatDate(bill.pimoMumbai?.dateReceived) || "N/A",
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices received at Mumbai",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions"
        },
        sortingCriteria: [
          "Sr No (Column 1)"
        ],
        filterLogic: "Dt of tax invoice recd at mumbai should be filled AND Sent to accts dept should be blank",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalAmount: Number(totalAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices received at Mumbai report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Invoices Given to Accounts Department Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesGivenToAcctsDept = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Tax invoice received at Mumbai date should be filled
      "pimoMumbai.dateReceived": { $ne: null, $exists: true },
      // Sent to accounts department should be filled
      "accountsDept.dateGiven": { $ne: null, $exists: true }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["accountsDept.dateGiven"] = { 
        $gte: new Date(startDate), 
        $lte: endOfDay(endDate) 
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by sr no
    const invoices = await Bill.find(filter).sort({ "srNo": 1 }).populate('vendor');
    
    console.log(`Found ${invoices.length} invoices given to accounts department`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalInvoiceAmount = 0;
    let totalCopAmount = 0;
    const reportData = invoices.map((bill) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
      const copAmt = parseFloat(bill.copDetails?.amount || 0);
      
      totalInvoiceAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
      totalCopAmount += !isNaN(copAmt) ? copAmt : 0;
      
      return {
        srNo: bill.srNo || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtGivenToAcctsDept: formatDate(bill.accountsDept?.dateGiven) || "N/A",
        copAmt: !isNaN(copAmt) ? Number(copAmt.toFixed(2)) : 0,
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices given to Accts Dept",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions"
        },
        sortingCriteria: [
          "Sr No (Column 1)"
        ],
        filterLogic: "Dt of tax invoice recd at mumbai should be filled (Column 62) AND Sent to accts dept should be filled (Column 80)",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          totalCopAmount: Number(totalCopAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices given to accounts department report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Invoices Given to QS Site Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesGivenToQsSite = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Invoices given to QS site should be filled
      "qsSite.dateGiven": { $ne: null, $exists: true }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["qsSite.dateGiven"] = { 
        $gte: new Date(startDate), 
        $lte: endOfDay(endDate) 
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by sr no
    const invoices = await Bill.find(filter).sort({ "srNo": 1 }).populate('vendor');
    
    console.log(`Found ${invoices.length} invoices given to QS site`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalInvoiceAmount = 0;
    const reportData = invoices.map((bill) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
      const copAmt = parseFloat(bill.copDetails?.amount || 0);
      
      totalInvoiceAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
      
      return {
        srNo: bill.srNo || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtGivenToQsSite: formatDate(bill.qsSite?.dateGiven) || "N/A",
        copAmt: !isNaN(copAmt) && copAmt > 0 ? Number(copAmt.toFixed(2)) : null,
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices given to QS site",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions"
        },
        sortingCriteria: [
          "Sr No (Column 1)"
        ],
        filterLogic: "Dt of Inv given to QS site should be filled (Column 35)",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices given to QS site report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Invoices Paid Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesPaid = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, poIdentification } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Date of payment should be filled (Column 89)
      "accountsDept.paymentDate": { $ne: null, $exists: true }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["accountsDept.paymentDate"] = { 
        $gte: new Date(startDate), 
        $lte: endOfDay(endDate)
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    // Add PO identification filter if provided (Column 38)
    if (poIdentification) {
      filter["poIdentification"] = poIdentification;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by sr no
    const invoices = await Bill.find(filter).sort({ "srNo": 1 }).populate('vendor');
    
    console.log(`Found ${invoices.length} invoices Paid`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalInvoiceAmount = 0;
    let totalPaymentAmount = 0;
    const reportData = invoices.map((bill) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
      const paymentAmt = parseFloat(bill.accountsDept?.paymentAmt || 0);
      
      totalInvoiceAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
      totalPaymentAmount += !isNaN(paymentAmt) ? paymentAmt : 0;
      
      return {
        srNo: bill.srNo || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendor?.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtGivenToAcctsDept: formatDate(bill.accountsDept?.dateGiven) || "N/A",
        dtRecdInAcctsDept: formatDate(bill.accountsDept?.dateReceived) || "N/A",
        dtOfPayment: formatDate(bill.accountsDept?.paymentDate) || "N/A",
        paymentAmt: !isNaN(paymentAmt) ? Number(paymentAmt.toFixed(2)) : 0,
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices Paid",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions",
          poIdentification: poIdentification || "All PO identifications"
        },
        sortingCriteria: [
          "Sr No (Column 1)"
        ],
        filterLogic: "Dt of payment should be filled (Column 89)",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          totalPaymentAmount: Number(totalPaymentAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices Paid report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Report of Pending Bills with PIMO/SVKM Site Office/QS Mumbai Office/QS Site Office
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPendingBillsReport = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region } = req.query;
    
    // Build filter object based on actual bill schema
    // This report gets bills that are still pending with various offices
    const filter = {
      // Invoice received at site but not yet completed/Paid
      "taxInvRecdAtSite": { $ne: null, $exists: true },
      // Not marked as completed (payment not made)
      "accountsDept.paymentDate": { $eq: null }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["taxInvRecdAtSite"] = { 
        $gte: new Date(startDate), 
        $lte: endOfDay(endDate)
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by sr no
    const pendingBills = await Bill.find(filter).sort({ "srNo": 1 }).populate('vendor');
    
    console.log(`Found ${pendingBills.length} pending bills`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalInvoiceAmount = 0;
    const reportData = pendingBills.map((bill) => {
      const invoiceAmount = parseFloat(bill.taxInvAmt || 0);
      totalInvoiceAmount += !isNaN(invoiceAmount) ? invoiceAmount : 0;
      
      return {
        srNo: bill.srNo || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendor?.vendorName || "N/A",
        invoiceNo: bill.taxInvNo || "N/A",
        invoiceDate: formatDate(bill.taxInvDate) || "N/A",
        invoiceAmount: !isNaN(invoiceAmount) ? Number(invoiceAmount.toFixed(2)) : 0,
        dateInvoiceReceivedAtSite: formatDate(bill.taxInvRecdAtSite) || "N/A",
        dateBillReceivedAtPimoRrrm: formatDate(bill.pimoMumbai?.dateReceived) || "N/A",
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Reports of pending bills with PIMO/SVKM site office/QS Mumbai office/QS site office",
        generatedAt: new Date().toISOString(),
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating pending bills report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Bill Journey Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBillJourney = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, vendorName } = req.query;
    
    // Build filter object - start with an empty filter to see if any bills exist
    const filter = {};
    
    console.log("Initial query with empty filter to check database contents");
    const totalCount = await Bill.countDocuments({});
    console.log(`Total bills in database: ${totalCount}`);
    
    // Check if dates are provided and valid before adding to filter
    if (startDate && endDate) {
      try {
        // Parse dates and ensure they're valid
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        
        if (!isNaN(parsedStartDate) && !isNaN(parsedEndDate)) {
          // Valid dates, add to filter
          filter["taxInvDate"] = { 
            $gte: parsedStartDate, 
            $lte: endOfDay(endDate) 
          };
          console.log(`Using date range: ${parsedStartDate.toISOString()} to ${parsedEndDate.toISOString()}`);
        } else {
          console.log(`Invalid dates provided: ${startDate}, ${endDate}`);
        }
      } catch (dateError) {
        console.error("Date parsing error:", dateError);
        // Continue without date filter if there's an error
      }
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
      console.log(`Using region filter: ${region}`);
    }
    
    // Add vendor filter if provided
    if (vendorName) {
      filter["vendorName"] = vendorName;
      console.log(`Using vendor filter: ${vendorName}`);
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Debug database schema - get first bill to check field names
    const sampleBill = await Bill.findOne({});
    if (sampleBill) {
      console.log("Sample bill document fields:", Object.keys(sampleBill._doc));
      console.log("Sample taxInvDate value:", sampleBill.taxInvDate);
    } else {
      console.log("No bills found in database at all");
    }
    
    // Fetch bills from database, sort by sr no
    const bills = await Bill.find(filter).sort({ "srNo": 1 }).populate('vendor');
    
    console.log(`Found ${bills.length} bills for journey report after applying filters`);
    
    // If no bills found, try a more relaxed query
    if (bills.length === 0 && (startDate || endDate || region || vendorName)) {
      console.log("No bills found with filters, trying more relaxed query...");
      // Try just the date filter without other constraints
      const relaxedFilter = {};
      if (startDate && endDate) {
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        if (!isNaN(parsedStartDate) && !isNaN(parsedEndDate)) {
          relaxedFilter["taxInvDate"] = { 
            $gte: parsedStartDate, 
            $lte: parsedEndDate 
          };
        }
      }
      const relaxedBills = await Bill.find(relaxedFilter).limit(10).populate('vendor');
      console.log(`Found ${relaxedBills.length} bills with relaxed query`);
      
      if (relaxedBills.length > 0) {
        // If we found bills with the relaxed query, check if they have the expected fields
        const sampleBill = relaxedBills[0];
        console.log("Sample bill with relaxed query:", {
          id: sampleBill._id,
          srNo: sampleBill.srNo,
          region: sampleBill.region,
          taxInvDate: sampleBill.taxInvDate,
          vendorName: sampleBill.vendorName
        });
      }
    }
    
    // Continue with report generation even if no bills found
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Calculate date differences in days
    const daysBetween = (date1, date2) => {
      if (!date1 || !date2) return null;
      
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
      
      // Calculate difference in milliseconds and convert to days
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    };
    
    // Process data for response
    let totalInvoiceAmount = 0;
    let totalSiteDays = 0;
    let totalMumbaiDays = 0;
    let totalAccountsDays = 0;
    let totalPaymentDays = 0;
    
    let countSiteDays = 0;
    let countMumbaiDays = 0;
    let countAccountsDays = 0;
    let countPaymentDays = 0;
    
    const reportData = bills.map((bill) => {
      const invoiceAmount = parseFloat(bill.taxInvAmt || 0);
      totalInvoiceAmount += !isNaN(invoiceAmount) ? invoiceAmount : 0;
      
      // Calculate delays and processing days
      const delay_for_receiving_invoice = daysBetween(bill.taxInvDate, bill.taxInvRecdAtSite);
      
      // Days at site: from receipt at site to dispatch to Mumbai
      const no_of_Days_Site = daysBetween(bill.taxInvRecdAtSite, bill.siteOfficeDispatch?.dateGiven);
      if (no_of_Days_Site !== null) {
        totalSiteDays += no_of_Days_Site;
        countSiteDays++;
      }
      
      // Days at Mumbai: from receipt at Mumbai to given to accounts
      const no_of_Days_at_Mumbai = daysBetween(bill.pimoMumbai?.dateReceived, bill.accountsDept?.dateGiven);
      if (no_of_Days_at_Mumbai !== null) {
        totalMumbaiDays += no_of_Days_at_Mumbai;
        countMumbaiDays++;
      }
      
      // Days at accounts: from receipt at accounts to payment
      const no_of_Days_at_AC = daysBetween(bill.accountsDept?.dateReceived, bill.accountsDept?.paymentDate);
      if (no_of_Days_at_AC !== null) {
        totalAccountsDays += no_of_Days_at_AC;
        countAccountsDays++;
      }
      
      // Total days for payment: from invoice date to payment date
      const days_for_payment = daysBetween(bill.taxInvDate, bill.accountsDept?.paymentDate);
      if (days_for_payment !== null) {
        totalPaymentDays += days_for_payment;
        countPaymentDays++;
      }
      
      return {
        srNo: bill.srNo || "N/A",
        region: bill.region || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendor?.vendorName || "N/A",
        invoiceDate: formatDate(bill.taxInvDate) || "N/A",
        invoiceAmount: !isNaN(invoiceAmount) ? Number(invoiceAmount.toFixed(2)) : 0,
        delay_for_receiving_invoice,
        no_of_Days_Site,
        no_of_Days_at_Mumbai,
        no_of_Days_at_AC,
        days_for_payment
      };
    });
    
    // Calculate averages
    const avgSiteDays = countSiteDays > 0 ? Number((totalSiteDays / countSiteDays).toFixed(1)) : 0;
    const avgMumbaiDays = countMumbaiDays > 0 ? Number((totalMumbaiDays / countMumbaiDays).toFixed(2)) : 0;
    const avgAccountsDays = countAccountsDays > 0 ? Number((totalAccountsDays / countAccountsDays).toFixed(1)) : 0;
    const avgPaymentDays = countPaymentDays > 0 ? Number((totalPaymentDays / countPaymentDays).toFixed(1)) : 0;
    
    // Prepare the final response
    const response = {
      report: {
        title: "Bill Journey",
        generatedAt: new Date().toISOString(),
        //Fix Filter Data
        filterCriteria: {
          dateRange: startDate && endDate ? {
            from: formatDate(new Date(startDate)),
            to: formatDate(new Date(endDate))
          } : "All dates"
        },
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          averageProcessingDays: {
            siteProcessing: avgSiteDays,
            mumbaiProcessing: avgMumbaiDays,
            accountingProcessing: avgAccountsDays,
            totalPaymentDays: avgPaymentDays
          }
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating bill journey report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};
