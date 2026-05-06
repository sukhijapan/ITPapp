-- Civil-Specific Public Template Library Seed

-- Clear existing public seeds to avoid duplicates (optional, but good for idempotency)
DELETE FROM itp_template_points WHERE template_id >= 200 AND template_id < 300;
DELETE FROM itp_templates WHERE id >= 200 AND id < 300;

-- 1. Earthworks: Bulk Excavation & Filling
INSERT INTO itp_templates (id, name, description, trade_category, is_public, version, created_by_org, clone_count) VALUES
(200, 'Bulk Earthworks (Civil)', 'Comprehensive ITP for excavation, placement, and compaction of fill materials for road and site pads.', 'Earthworks', true, '1.0', 'CivilStandard', 120);

INSERT INTO itp_template_points (template_id, sequence, section, description, type, responsible_party, acceptance_criteria, reference_documents, inspection_method, frequency, verifying_records) VALUES
(200, 1, 'Pre-Start', 'Survey set-out and ground levels', 'HP', 'SUR', 'Matches IFC drawings within ±50mm', 'IFC Drawings', 'Survey', 'Once', 'Survey Report'),
(200, 2, 'Pre-Start', 'Clearing and Grubbing verification', 'IP', 'SUP', 'All organic material removed', 'Project Specs', 'Visual', 'Continuous', 'Photos'),
(200, 3, 'Excavation', 'Proof rolling of subgrade', 'HP', 'ENG', 'No visible deflection under loaded truck', 'AS 1289.6.2.1', 'Visual/Test', 'Each Layer', 'Proof Roll Log'),
(200, 4, 'Placement', 'Material selection and classification', 'RP', 'ENG', 'Meets specification (CBR, PI)', 'AS 1289', 'Review', 'Per Source', 'Test Certificates'),
(200, 5, 'Compaction', 'Field density testing (Hilot / Nuclear)', 'HP', 'ENG', '≥ 98% Standard Compaction (MDD)', 'AS 1289.5.4.1', 'Test', '1 test per 500m³', 'Lab Reports'),
(200, 6, 'Compaction', 'Layer thickness verification', 'IP', 'SS', 'Max 250mm loose thickness', 'Method Statement', 'Measure', 'Each Layer', 'Log Book'),
(200, 7, 'Finalization', 'Final trim survey and levels', 'RP', 'SUR', 'Matches design levels ±20mm', 'IFC Drawings', 'Survey', 'Final', 'As-Built Plan');

-- 2. Concrete: Bridge Abutment / Large Structure
INSERT INTO itp_templates (id, name, description, trade_category, is_public, version, created_by_org, clone_count) VALUES
(201, 'Bridge Abutment Concrete', 'Detailed inspection for high-strength structural concrete elements in civil infrastructure.', 'Concrete', true, '1.1', 'CivilStandard', 85);

INSERT INTO itp_template_points (template_id, sequence, section, description, type, responsible_party, acceptance_criteria, reference_documents, inspection_method, frequency, verifying_records) VALUES
(201, 1, 'Pre-Pour', 'Reinforcement placement and spacing', 'HP', 'ENG', 'Bar sizes and spacing as per IFC', 'AS 3600', 'Measure', 'Per Pour', 'Checklist/Photos'),
(201, 2, 'Pre-Pour', 'Concrete cover verification', 'HP', 'ENG', 'Min 50mm (or per specs)', 'AS 3600', 'Measure', 'Per Pour', 'Photos'),
(201, 3, 'Pre-Pour', 'Formwork stability and cleanliness', 'WP', 'SUP', 'Rigid and free of debris', 'AS 3610', 'Visual', 'Per Pour', 'Checklist'),
(201, 4, 'During Pour', 'Slump test and sampling', 'WP', 'SUP', 'Target slump ±20mm', 'AS 1012.3.1', 'Test', 'Every 20m³', 'Delivery Dockets'),
(201, 5, 'During Pour', 'Concrete temperature monitoring', 'IP', 'SS', 'Max 32°C (or per specs)', 'Project Specs', 'Measure', 'Hourly', 'Temp Log'),
(201, 6, 'During Pour', 'Vibration and placement method', 'IP', 'SUP', 'No segregation, uniform compaction', 'AS 3600', 'Visual', 'Continuous', 'Log Book'),
(201, 7, 'Post-Pour', 'Curing duration and method', 'IP', 'SS', 'Curing compound or 7-day wet cure', 'AS 3600', 'Visual', 'Daily', 'Curing Log'),
(201, 8, 'Post-Pour', 'Compression test results (28 Days)', 'HP', 'ENG', 'Characteristic strength (f''c) met', 'AS 1012.9', 'Review', 'Per Pour', 'Lab Certificate');

-- 3. Structural Steel: Highway Sign Gantries / Small Bridges
INSERT INTO itp_templates (id, name, description, trade_category, is_public, version, created_by_org, clone_count) VALUES
(202, 'Structural Steel Erection', 'ITP for assembly and erection of structural steel members including welding and bolting.', 'Steel', true, '1.0', 'CivilStandard', 45);

INSERT INTO itp_template_points (template_id, sequence, section, description, type, responsible_party, acceptance_criteria, reference_documents, inspection_method, frequency, verifying_records) VALUES
(202, 1, 'Fabrication', 'Material traceability / Mill certificates', 'RP', 'ENG', 'Matches grade specified (e.g. Grade 350)', 'AS 4100', 'Review', 'Batch', 'Mill Certificates'),
(202, 2, 'Fabrication', 'Welding NDT (Magnetic Particle / Ultrasonic)', 'HP', 'ENG', 'Meets AS/NZS 1554.1 requirements', 'AS 1554.1', 'Test', 'Sample', 'NDT Reports'),
(202, 3, 'Erection', 'Holding down bolt location/level', 'HP', 'SUR', 'Within ±5mm alignment', 'IFC Drawings', 'Survey', 'Per Footing', 'Survey Report'),
(202, 4, 'Erection', 'Plumbness and alignment of members', 'WP', 'SUP', 'Vertical within 1:500', 'AS 4100', 'Measure', 'Each Member', 'Photos'),
(202, 5, 'Erection', 'Bolt tensioning (Part-turn/Torque)', 'HP', 'SUP', 'High strength bolts tensioned to specs', 'AS 4100', 'Test', '100% Visual', 'Torque Record'),
(202, 6, 'Finalization', 'Coating/Galvanizing touch-up', 'IP', 'SS', 'Dry film thickness (DFT) meets specs', 'AS 2312', 'Test', 'Continuous', 'DFT Log');

-- Reset sequences
SELECT setval('itp_templates_id_seq', (SELECT GREATEST(MAX(id), 202) FROM itp_templates));
SELECT setval('itp_template_points_id_seq', (SELECT GREATEST(MAX(id), (SELECT MAX(id) FROM itp_template_points)) FROM itp_template_points));
