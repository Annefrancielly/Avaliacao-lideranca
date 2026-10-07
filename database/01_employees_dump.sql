DROP TABLE IF EXISTS leader_lead;
DROP TABLE IF EXISTS employee;

-- ------------------------------------------------------------
--  Table: employee
-- ------------------------------------------------------------
CREATE TABLE employee (
    id            SERIAL          PRIMARY KEY,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    position_name VARCHAR(100)    NOT NULL
);
-- -----------------------------------------------------------
--  Table: leader_lead
-- ------------------------------------------------------------

CREATE TABLE leader_lead (
    leader_id  INT NOT NULL,
    lead_id    INT NOT NULL,
    PRIMARY KEY (leader_id, lead_id),
    CONSTRAINT fk_leader
        FOREIGN KEY (leader_id) REFERENCES employee(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lead
        FOREIGN KEY (lead_id)   REFERENCES employee(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_no_self_lead CHECK (leader_id <> lead_id)
);

INSERT INTO employee (id, name, email, position_name) VALUES
( 1, 'Alice Hartman',    'alice.hartman@company.com',    'CEO'),
( 2, 'Bob Sinclair',     'bob.sinclair@company.com',     'CTO'),
( 3, 'Carol Nguyen',     'carol.nguyen@company.com',     'CFO'),
( 4, 'David Okafor',     'david.okafor@company.com',     'Engineering Manager'),
( 5, 'Eva Müller',       'eva.muller@company.com',       'Engineering Manager'),
( 6, 'Frank Rossi',      'frank.rossi@company.com',      'Product Manager'),
( 7, 'Grace Kim',        'grace.kim@company.com',        'UX Designer'),
( 8, 'Henry Patel',      'henry.patel@company.com',      'Senior Software Engineer'),
( 9, 'Isabelle Dubois',  'isabelle.dubois@company.com',  'Senior Software Engineer'),
(10, 'James Watanabe',   'james.watanabe@company.com',   'Software Engineer'),
(11, 'Karen Oliveira',   'karen.oliveira@company.com',   'Software Engineer'),
(12, 'Liam Johansson',   'liam.johansson@company.com',   'Software Engineer'),
(13, 'Mia Fernandez',    'mia.fernandez@company.com',    'Data Engineer'),
(14, 'Noah Chukwu',      'noah.chukwu@company.com',      'Data Analyst'),
(15, 'Olivia Brooks',    'olivia.brooks@company.com',    'QA Engineer'),
(16, 'Paul Nakamura',    'paul.nakamura@company.com',    'QA Engineer'),
(17, 'Quinn Santos',     'quinn.santos@company.com',     'DevOps Engineer'),
(18, 'Rachel Ivanova',   'rachel.ivanova@company.com',   'Finance Analyst'),
(19, 'Samuel Osei',      'samuel.osei@company.com',      'Finance Analyst'),
(20, 'Tina Bergmann',    'tina.bergmann@company.com',    'HR Specialist');

SELECT setval('employee_id_seq', 20);

INSERT INTO leader_lead (leader_id, lead_id) VALUES
(1,  2),  
(1,  3),  
(1,  6),  
(1, 20), 
(2,  4),   
(2,  5),   
(2,  7),   
(2, 17),   
(2, 16),   
(4,  8),   
(4, 12),   
(8, 10),   
(8, 11),   
(5,  9),   
(5, 13),  
(5, 14),  
(3, 18),   
(3, 19),   
(6, 15);   
