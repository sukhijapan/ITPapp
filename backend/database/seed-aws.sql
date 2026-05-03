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

-- Reset sequences so future inserts get correct IDs
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));
SELECT setval('itp_templates_id_seq', (SELECT MAX(id) FROM itp_templates));
SELECT setval('itp_template_points_id_seq', (SELECT MAX(id) FROM itp_template_points));
SELECT setval('itp_instances_id_seq', (SELECT MAX(id) FROM itp_instances));
SELECT setval('itp_points_id_seq', (SELECT MAX(id) FROM itp_points));
