const ROLES = {
  SUBCONTRACTOR: 1,
  HEAD_CONTRACTOR: 2,
  CLIENT: 3,
  ADMIN: 4,
};

const ROLE_NAMES = {
  [ROLES.SUBCONTRACTOR]: 'Subcontractor',
  [ROLES.HEAD_CONTRACTOR]: 'Head Contractor',
  [ROLES.CLIENT]: 'Client',
  [ROLES.ADMIN]: 'Admin',
};

module.exports = { ROLES, ROLE_NAMES };
