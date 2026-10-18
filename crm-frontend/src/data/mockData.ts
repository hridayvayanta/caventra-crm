import { Lead, User, Activity } from '../types/crm';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_founder_1',
    name: 'Hriday Vayanta',
    email: 'hriday@caventra.com',
    role: 'founder',
    status: 'active',
    phoneNumber: '+91 9876543210',
    initials: 'HV',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// No demo data — starts clean
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
