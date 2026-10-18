import { Lead, User, Activity } from '../types/crm';

export const STATIC_FOUNDERS: User[] = [
  {
    id: 'founder_hriday',
    name: 'Hriday Vayanta',
    email: 'hridayvayanta7@gmail.com',
    role: 'founder',
    status: 'active',
    phoneNumber: '+91 9876543210',
    initials: 'HV',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'founder_ved',
    name: 'Ved Nimbark',
    email: 'vednimbark08@gmail.com',
    role: 'founder',
    status: 'active',
    phoneNumber: '+91 9876543211',
    initials: 'VN',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'founder_sauran',
    name: 'Sauran Ahmed',
    email: 'sauranahmed12345678@gmail.com',
    role: 'founder',
    status: 'active',
    phoneNumber: '+91 9876543212',
    initials: 'SA',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_USERS: User[] = STATIC_FOUNDERS;

// Starts clean with zero demo data
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
