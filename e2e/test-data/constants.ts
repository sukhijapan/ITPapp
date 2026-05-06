/**
 * Test data constants for E2E tests.
 * These values correspond to the seeded data in the development database.
 * IDs use high values (9000+) and emails use @test.local to avoid collision with real data.
 */

export const TEST_USERS = {
  subcontractor: {
    email: 'e2e-subcontractor@test.local',
    password: 'TestPass123!',
    fullName: 'E2E Subcontractor',
    roleId: 1,
  },
  headContractor: {
    email: 'e2e-headcontractor@test.local',
    password: 'TestPass123!',
    fullName: 'E2E Head Contractor',
    roleId: 2,
  },
  client: {
    email: 'e2e-client@test.local',
    password: 'TestPass123!',
    fullName: 'E2E Client',
    roleId: 3,
  },
  admin: {
    email: 'e2e-admin@test.local',
    password: 'TestPass123!',
    fullName: 'E2E Admin',
    roleId: 4,
  },
} as const;

export const DEACTIVATED_USER = {
  email: 'e2e-deactivated@test.local',
  password: 'TestPass123!',
  fullName: 'E2E Deactivated User',
  roleId: 1,
};

export const TEST_PROJECT = {
  id: 9000,
  name: 'E2E Test Project',
  description: 'Automated testing project — do not delete',
};

export const TEST_TEMPLATE = {
  id: 9000,
  name: 'E2E Test Template',
  projectId: 9000,
};

export const TEST_ITP_INSTANCES = {
  draft: { id: 9001, status: 'Draft' },
  pendingReview: { id: 9002, status: 'Pending Review' },
  open: { id: 9003, status: 'Open' },
  closed: { id: 9004, status: 'Closed' },
} as const;

export const TEST_NCRS = {
  open: { id: 9001, status: 'Open' },
  closed: { id: 9002, status: 'Closed' },
} as const;
