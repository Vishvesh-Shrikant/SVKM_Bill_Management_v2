import Bill from "../models/bill-model.js";

// Map roles to workflow levels
const roleLevelMap = {
  site_officer: 1,
  quality_inspector: 1,
  quantity_surveyor: 1,
  architect: 1,
  site_engineer: 1,
  site_incharge: 1,
  trustees: 1,
  fi: 3,
  it_office_mumbai: 3,
  pimo_mumbai: 2,
  qs_mumbai: 3,
  accounts_department: 7,
  // Add other roles and their levels as needed
};

// GET /api/workflow/above-level/:role
export const getBillsAboveLevel = async (req, res) => {
  try {
    const { role } = req.params;
    const level = roleLevelMap[role];
    if (level === undefined) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided",
      });
    }
    const bills = await Bill.find({ currentCount: { $gt: level } })
      .populate("region")
      .populate("panStatus")
      .populate("currency")
      .populate("natureOfWork")
      .populate("compliance206AB")
      .populate("vendor");

    const mappedBills = bills.map((bill) => {
      const billObj = bill.toObject();
      billObj.region = Array.isArray(billObj.region)
        ? billObj.region.map((r) => r?.name || r)
        : billObj.region;
      billObj.panStatus = billObj.panStatus?.name || billObj.panStatus || null;
      billObj.complianceMaster =
        billObj.complianceMaster?.compliance206AB ||
        billObj.complianceMaster ||
        null;
      billObj.currency = billObj.currency?.currency || billObj.currency || null;
      billObj.natureOfWork =
        billObj.natureOfWork?.natureOfWork || billObj.natureOfWork || null;
      billObj.compliance206AB =
        billObj.compliance206AB?.compliance206AB ||
        billObj.compliance206AB ||
        null;

      if (billObj.vendor && typeof billObj.vendor === "object") {
        billObj.vendorNo = billObj.vendor.vendorNo;
        billObj.vendorName = billObj.vendor.vendorName;
        billObj.PAN = billObj.vendor.PAN;
        billObj.GSTNumber = billObj.vendor.GSTNumber;
        billObj.complianceStatus = billObj.vendor.complianceStatus;
        billObj.PANStatus = billObj.vendor.PANStatus;
      }
      delete billObj.vendor;
      return billObj;
    });
    return res.status(200).json({
      success: true,
      data: mappedBills,
    });
  } catch (error) {
    console.error("Error fetching bills above level:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bills above level",
      error: error.message,
    });
  }
};