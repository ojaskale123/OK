const mongoose = require('mongoose');

const jobSheetSchema = new mongoose.Schema({
  shopkeeperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobNumber: { type: String, required: true },
  jobDate: { type: String, default: '' },
  acceptanceTime: { type: String, default: '' },
  serviceCenterName: { type: String, default: '' },
  serviceCenterContact: { type: String, default: '' },
  serviceCenterAddress: { type: String, default: '' },
  serviceCenterEmail: { type: String, default: '' },
  serviceCenterTiming: { type: String, default: '' },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerPhone2: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerAddress: { type: String, default: '' },
  repairType: { type: String, default: '' },
  repairSenderInfo: { type: String, default: '' },
  productType: { type: String, default: 'Mobile Phone' },
  productInfo: { type: String, default: '' },
  productImei: { type: String, default: '' },
  deviceIssue: { type: String, default: '' },
  checklist: { type: mongoose.Schema.Types.Mixed, default: {} },
  accessories: { type: mongoose.Schema.Types.Mixed, default: {} },
  handsetAppearance: { type: String, default: '' },
  remarks: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  instaQrUrl: { type: String, default: '' },
  googleQrUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

jobSheetSchema.index({ shopkeeperId: 1, createdAt: -1 });

module.exports = mongoose.model('JobSheet', jobSheetSchema);
