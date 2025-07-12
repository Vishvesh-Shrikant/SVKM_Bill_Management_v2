import mongoose from "mongoose";

const vendorMasterSchema = new mongoose.Schema(
  {
    vendorNo: { type: Number, unique: true, required: true },
    vendorName: { type: String, required: true },
    PAN: { type: String, required: true },
    GSTNumber: { type: String, required: true },
    complianceStatus: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ComplianceMaster', 
      required: true 
    }, 
    PANStatus: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'PanStatusMaster', 
      required: true 
    }, 
    emailIds: { type: [String], required: true }, 
    phoneNumbers: { type: [String], required: true }, 
  },
  { timestamps: true }
);

const VendorMaster = mongoose.model("VendorMaster", vendorMasterSchema);

export default VendorMaster;