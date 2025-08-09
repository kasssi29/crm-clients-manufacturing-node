import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  model: String,
  serial: String,
  purchaseDate: Date,
  serviceStatus: { type: String, enum: ['none', 'notified', 'completed'], default: 'none' },
  lastServiceNotified: Date,
  serviceDueDate: Date,
});

const clientSchema = new mongoose.Schema({
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientContactPerson: {"type": String, required: true, maxLength: 100, trim: true},
  companyName: {"type": String, default: null, maxLength: 100, },
  contactEmail: {"type": String, required: true, trim: true, match: /^\S+@\S+\.\S+$/},
  contactPhone: {"type": String, default: null, trim: true, match: /^\+?[1-9]\d{1,14}$/}, 
  equipment: [equipmentSchema],
  notes: {"type": String, maxLength: 500, default: null},
  isActive: { type: Boolean, default: true }
});

export default mongoose.model('Client', clientSchema);
