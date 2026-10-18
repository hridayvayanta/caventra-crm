import { Lead, User, Activity, IngestionBatch } from '../types/crm';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_1',
    name: 'Hriday Vayanta',
    email: 'hriday@caventra.com',
    role: 'admin',
    initials: 'HV',
  },
  {
    id: 'user_2',
    name: 'Team Member',
    email: 'team@caventra.com',
    role: 'employee',
    initials: 'TM',
  },
];

// No demo data — starts clean
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_BATCHES: IngestionBatch[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
