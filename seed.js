import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from './models/User.js';
import Client from './models/Client.js';

dotenv.config();

const req = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const MONGO_URI = req('MONGO_URI');

const ADMIN_EMAIL      = process.env.ADMIN_EMAIL      || 'admin@example.com';
const SUP_EMAIL        = process.env.SUPERVISOR_EMAIL || 'supervisor@example.com';
const M1_EMAIL         = process.env.MANAGER1_EMAIL   || 'manager1@example.com';
const M2_EMAIL         = process.env.MANAGER2_EMAIL   || 'manager2@example.com';
const M3_EMAIL         = process.env.MANAGER3_EMAIL   || 'manager3@example.com';

const ADMIN_PASSWORD   = req('ADMIN_PASSWORD');
const SUP_PASSWORD     = req('SUPERVISOR_PASSWORD');
const M1_PASSWORD      = req('MANAGER1_PASSWORD');
const M2_PASSWORD      = req('MANAGER2_PASSWORD');
const M3_PASSWORD      = req('MANAGER3_PASSWORD');

/**
 * Build equipment items (Caterpillar pumps)
 */
const makePump = (idx, purchaseISO) => ({
  model: `Caterpillar Pump CP-${idx}`,
  serial: `CAT-CP-${idx}-${Math.floor(100000 + Math.random() * 899999)}`,
  purchaseDate: new Date(purchaseISO),
  serviceStatus: 'none',
  serviceDueDate: new Date(new Date(purchaseISO).setFullYear(new Date(purchaseISO).getFullYear() + 1)),
  lastServiceNotified: null
});

/**
 * IMPORTANT: Your Client schema expects:
 * - contactEmail (required, email)
 * - contactPhone (E.164 format, e.g. +353123456789)
 * - clientContactPerson (required)
 * - managerId (required)
 * - equipment []
 * - notes (optional), isActive (default true)
 */
const companyTriplet = (baseName, contact, emailPrefix, managerId) => {
  // In one of the 3 companies add two equipment items
  const companies = [
    {
      companyName: `${baseName} Alpha Ltd`,
      clientContactPerson: contact,
      contactEmail: `${emailPrefix}.alpha@demo.local`,
      contactPhone: '+353111000001', // E.164 (no spaces/dashes)
      isActive: true,
      managerId,
      equipment: [ makePump('A1', '2024-08-01') ],
      notes: 'Auto-seeded company (Alpha)'
    },
    {
      companyName: `${baseName} Beta Ltd`,
      clientContactPerson: contact,
      contactEmail: `${emailPrefix}.beta@demo.local`,
      contactPhone: '+353111000002',
      isActive: true,
      managerId,
      equipment: [ makePump('B1', '2024-09-15'), makePump('B2', '2024-10-05') ], // two items here
      notes: 'Auto-seeded company (Beta)'
    },
    {
      companyName: `${baseName} Gamma Ltd`,
      clientContactPerson: contact,
      contactEmail: `${emailPrefix}.gamma@demo.local`,
      contactPhone: '+353111000003',
      isActive: true,
      managerId,
      equipment: [ makePump('G1', '2025-01-20') ],
      notes: 'Auto-seeded company (Gamma)'
    }
  ];
  return companies;
};

async function connectDb() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');
}

async function clearCollections() {
  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({})
  ]);
  console.log('🧹 Cleared users & clients collections');
}

async function createUsers() {
  const [adminHash, supHash, m1Hash, m2Hash, m3Hash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 10),
    bcrypt.hash(SUP_PASSWORD, 10),
    bcrypt.hash(M1_PASSWORD, 10),
    bcrypt.hash(M2_PASSWORD, 10),
    bcrypt.hash(M3_PASSWORD, 10),
  ]);

  const admin = await User.create({
    name: 'Admin',
    email: ADMIN_EMAIL,
    password: adminHash,
    role: 'admin'
  });

  const supervisor = await User.create({
    name: 'Supervisor',
    email: SUP_EMAIL,
    password: supHash,
    role: 'supervisor'
  });

  const m1 = await User.create({
    name: 'Manager One',
    email: M1_EMAIL,
    password: m1Hash,
    role: 'manager'
  });
  const m2 = await User.create({
    name: 'Manager Two',
    email: M2_EMAIL,
    password: m2Hash,
    role: 'manager'
  });
  const m3 = await User.create({
    name: 'Manager Three',
    email: M3_EMAIL,
    password: m3Hash,
    role: 'manager'
  });

  console.log('👤 Users created: admin, supervisor, 3 managers');
  return { admin, supervisor, managers: [m1, m2, m3] };
}

async function createClientsForManagers(managers) {
  for (let i = 0; i < managers.length; i++) {
    const mgr = managers[i];
    const companies = companyTriplet(`Acme M${i+1}`, `Contact M${i+1}`, `m${i+1}`, mgr._id);
    await Client.insertMany(companies);
    console.log(`🏢 Created 3 companies for manager ${mgr.email}`);
  }
}

async function seed() {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  You are running the seeder with NODE_ENV=production. This will WIPE users & clients!');
    }

    await connectDb();
    await clearCollections();
    const { managers } = await createUsers();
    await createClientsForManagers(managers);
    console.log('🌱 Seeding finished successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
