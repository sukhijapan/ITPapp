-- Seed data from local finalized database

-- Project
INSERT INTO projects (id, name, description) VALUES
  (1, 'VISTA', 'D-Wall Construction Project');

-- Template (v6 Final)
INSERT INTO itp_templates (id, project_id, name, description) VALUES
  (1, 1, 'Diaphragm Wall (v6 Final)', 'Full Professional ITP');

-- Template Points
INSERT INTO itp_template_points (id, template_id, sequence, description, type, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party) VALUES
  (1, 1, 1, 'Approved D-Wall Design & Confirm drawings on site are IFC', 'HP', 'Correct drawings in use on site', 'Latest Drawing Transmittal', 'Document', 'Once - Prior to Commencement', 'ENG'),
  (2, 1, 2, 'Concrete mix design confirmation', 'HP', 'Approved by designer', 'GDA Design Report', 'Document', 'Once - Prior to Commencement', 'ENG'),
  (3, 1, 3, 'D-wall panel excavation and Trench Stabilization', 'HP', 'Excavation as per design report', 'Design report / Method statements', 'Document + Measure', 'Each DW', 'SUP'),
  (4, 1, 4, 'Cage Placement as per shop drawings', 'HP', 'Installed as per design', 'Approved shop drawings', 'Record', 'Per DW', 'SUP');

-- ITP Instance
INSERT INTO itp_instances (id, template_id, project_id, name, status, created_by) VALUES
  (1, 1, 1, 'D-Wall Panel #001 (Final Verification)', 'Open', 1);

-- ITP Instance Points
INSERT INTO itp_points (id, instance_id, sequence, description, type, status, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party) VALUES
  (1, 1, 1, 'Approved D-Wall Design & Confirm drawings on site are IFC', 'HP', 'Open', 'Correct drawings in use on site', 'Latest Drawing Transmittal', 'Document', 'Once - Prior to Commencement', 'ENG'),
  (2, 1, 2, 'Concrete mix design confirmation', 'HP', 'Open', 'Approved by designer', 'GDA Design Report', 'Document', 'Once - Prior to Commencement', 'ENG'),
  (3, 1, 3, 'D-wall panel excavation and Trench Stabilization', 'HP', 'Open', 'Excavation as per design report', 'Design report / Method statements', 'Document + Measure', 'Each DW', 'SUP'),
  (4, 1, 4, 'Cage Placement as per shop drawings', 'HP', 'Open', 'Installed as per design', 'Approved shop drawings', 'Record', 'Per DW', 'SUP');

-- Full 20-point D-Wall Template (Professional ITP matching source document)
INSERT INTO itp_templates (id, project_id, name, description) VALUES
  (2, 1, 'Diaphragm Wall — Full ITP (20 Points)', 'Complete professional ITP matching source document ITP-001. Covers all 4 stages: Approvals, Pre-construction, Construction, Post-Pour.');

-- Stage 1: Approvals and Preliminary Requirements (6 points)
INSERT INTO itp_template_points (id, template_id, sequence, description, type, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id) VALUES
  (5,  2, 1,  'Approved D-Wall Design & confirm drawings on site are IFC',           'HP', 'Correct IFC drawings in use on site',                          'Latest Drawing Transmittal',              'Document',        'Once — Prior to Commencement', 'ENG', 'Stage 1 — Approvals & Preliminary Requirements', 'IFC Drawing Transmittal',                     2),
  (6,  2, 2,  'ACRS reinforcement compliance certificates received and approved',    'RP', 'ACRS certificate current and applicable to supplied steel',    'ACRS Certificate',                        'Document',        'Once — Prior to Commencement', 'ENG', 'Stage 1 — Approvals & Preliminary Requirements', 'ACRS Compliance Certificate',                 2),
  (7,  2, 3,  'Reinforcement schedules approved and issued for construction',        'HP', 'Schedules approved by designer',                               'Designer-Approved Reo Schedule',          'Document',        'Once — Prior to Commencement', 'ENG', 'Stage 1 — Approvals & Preliminary Requirements', 'Approved Reinforcement Schedule',             2),
  (8,  2, 4,  'Shop drawings approved and on site (cage, guide wall)',               'HP', 'Approved shop drawings held on site',                          'Approved Shop Drawings',                  'Document',        'Once — Prior to Commencement', 'ENG', 'Stage 1 — Approvals & Preliminary Requirements', 'Approved Shop Drawings',                      2),
  (9,  2, 5,  'Concrete mix design confirmed and approved by designer',              'HP', 'Mix design approved — meets f''c, w/c ratio, slump',           'GDA Design Report, Mix Design Report',    'Document',        'Once — Prior to Commencement', 'ENG', 'Stage 1 — Approvals & Preliminary Requirements', 'Designer-Approved Mix Design Report',         2),
  (10, 2, 6,  'Survey setout confirmed — panel positions marked',                    'HP', 'Survey setout within design tolerance',                        'Survey Report, Design Drawings',          'Document+Measure','Once per Panel',               'SUP', 'Stage 1 — Approvals & Preliminary Requirements', 'Survey Report',                               1);

-- Stage 2: Pre-construction Activities (4 points)
INSERT INTO itp_template_points (id, template_id, sequence, description, type, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id) VALUES
  (11, 2, 7,  'Working platform TWD reviewed and approved',                          'HP', 'Platform meets TWD loading and batter requirements',           'Approved TWD, TWD Calculation',           'Document',        'Once — Prior to Commencement', 'SUP', 'Stage 2 — Pre-construction Activities',        'Approved TWD, Platform Inspection Record',     1),
  (12, 2, 8,  'Guide wall construction complete and inspected',                      'HP', 'Geometry, cover, and alignment per design',                    'Design Drawings, Method Statement',       'Visual+Measure',  'Once per Panel Setup',         'SUP', 'Stage 2 — Pre-construction Activities',        'Guide Wall Inspection Record',                1),
  (13, 2, 9,  'Excavation plant and equipment pre-use check',                        'RP', 'Plant serviceable — pre-start checklist completed',            'Equipment Checklist, Service Records',    'Document',        'Each Shift',                   'SUP', 'Stage 2 — Pre-construction Activities',        'Equipment Pre-start Checklist',               1),
  (14, 2, 10, 'Pre-pour planning meeting held with all relevant parties',            'WP', 'Meeting held, minutes recorded, all parties signed off',       'Method Statement, Design Report',         'Document',        'Prior to Each Pour',           'ENG', 'Stage 2 — Pre-construction Activities',        'Pre-pour Meeting Minutes',                    2);

-- Stage 3: Construction and Concrete Placement (6 points)
INSERT INTO itp_template_points (id, template_id, sequence, description, type, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id) VALUES
  (15, 2, 11, 'D-wall panel excavation complete and Trench Stabilization confirmed', 'HP', 'Excavation depth, width per design; slurry levels maintained',  'Design Report, Method Statement',         'Document+Measure','Each Panel',                   'SUP', 'Stage 3 — Construction & Concrete Placement',  'ITC001 — DW Panel Excavation Record',         1),
  (16, 2, 12, 'Bentonite / polymer slurry test results acceptable',                  'HP', 'Density, viscosity, pH within spec per method statement',      'Method Statement, AS standards',          'Test',            'Each Batch + During Excavation','SUP', 'Stage 3 — Construction & Concrete Placement',  'Slurry Test Report',                          1),
  (17, 2, 13, 'Reinforcement cage placed as per approved shop drawings',             'HP', 'Cage position, cover, and splice lengths per drawings',        'Approved Shop Drawings',                  'Visual+Record',   'Each Panel',                   'SUP', 'Stage 3 — Construction & Concrete Placement',  'Cage Placement Record, Photos',               1),
  (18, 2, 14, 'Tremie pipe setup and placement confirmed',                           'HP', 'Tremie reaches base of panel; seal confirmed before pour',     'Method Statement',                        'Visual+Measure',  'Each Panel',                   'SUP', 'Stage 3 — Construction & Concrete Placement',  'Tremie Setup Record',                         1),
  (19, 2, 15, 'Concrete delivery dockets checked against mix design',               'RP', 'Dockets match approved mix design; no substitutions',          'Approved Mix Design',                     'Document',        'Each Load',                    'SUP', 'Stage 3 — Construction & Concrete Placement',  'Concrete Delivery Dockets',                   1),
  (20, 2, 16, 'Concrete placement and slump / cylinder sampling',                   'WP', 'Slump within spec; 3 x cylinders per 50m³ or per pour',        'AS 1012, Mix Design Report',              'Test+Record',     'Each Pour',                    'ENG', 'Stage 3 — Construction & Concrete Placement',  'Concrete Pour Record, Slump Test, Cylinders', 2);

-- Stage 4: Post-Pour (4 points)
INSERT INTO itp_template_points (id, template_id, sequence, description, type, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id) VALUES
  (21, 2, 17, '7-day concrete compressive strength test results',                    'RP', '7-day results within acceptable range per mix design',         'AS 1012.9, Mix Design Report',            'Document',        'Per Pour',                     'ENG', 'Stage 4 — Post-Pour',                          '7-day Test Certificate',                      2),
  (22, 2, 18, '28-day concrete compressive strength test results',                   'HP', '28-day results meet or exceed specified f''c',                 'AS 1012.9, AS 3600, Mix Design Report',   'Document',        'Per Pour',                     'ENG', 'Stage 4 — Post-Pour',                          '28-day Test Certificate',                     2),
  (23, 2, 19, 'Basement excavation inspection — panel integrity confirmed',          'WP', 'No visible honeycombing, cold joints, or defects at exposure', 'Design Report, NCR Register',             'Visual',          'At Basement Excavation',       'ENG', 'Stage 4 — Post-Pour',                          'Excavation Inspection Record, Photos',        2),
  (24, 2, 20, 'As-built documentation completed and NCR register checked',           'RP', 'All as-built drawings issued; zero open NCRs before closeout', 'As-built Drawings, NCR Register',         'Document',        'At Closeout',                  'ENG', 'Stage 4 — Post-Pour',                          'As-built Drawings, Closed NCR Register',      2);

-- Reset sequences so future inserts get correct IDs
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));
SELECT setval('itp_templates_id_seq', (SELECT MAX(id) FROM itp_templates));
SELECT setval('itp_template_points_id_seq', (SELECT MAX(id) FROM itp_template_points));
SELECT setval('itp_instances_id_seq', (SELECT MAX(id) FROM itp_instances));
SELECT setval('itp_points_id_seq', (SELECT MAX(id) FROM itp_points));
