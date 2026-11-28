-- AWS Student Builder: saved visitor names. Own database, separate from Caddy.
-- Run this whole script once, connected as an ADMIN account, in DBeaver (SQL Editor, Alt+X).
-- It is safe to run twice.

CREATE DATABASE IF NOT EXISTS aws_iam_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS aws_iam_platform.visitors (
  id           CHAR(36)     NOT NULL,                              -- random id kept in the visitor_id cookie
  display_name VARCHAR(30)  NOT NULL,                              -- legacy profile name or generic anonymous quiz label
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_visitors_name_length CHECK (CHAR_LENGTH(display_name) BETWEEN 2 AND 30)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quiz: nine questions per visitor (different for each person), one row per question.
CREATE TABLE IF NOT EXISTS aws_iam_platform.quiz_assignments (
  visitor_id   CHAR(36)     NOT NULL,                              -- same id as visitors.id
  slot         TINYINT      NOT NULL,                              -- question number, 1 to 9
  question_key VARCHAR(40)  NOT NULL,                              -- which question of the bank this person received
  option_order VARCHAR(20)  NOT NULL,                              -- the order in which the answers are shown, for example 2,0,1
  chosen_index TINYINT      NULL,                                  -- the answer chosen (empty until the question is submitted)
  is_correct   TINYINT(1)   NULL,                                  -- 1 = point earned, 0 = no point
  answered_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (visitor_id, slot),
  KEY idx_quiz_answered (answered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IMPORTANT for the quiz: the website account also needs access to the new table.
GRANT SELECT, INSERT, UPDATE, DELETE ON aws_iam_platform.quiz_assignments TO 'aws'@'%';
FLUSH PRIVILEGES;

-- The website account must only be able to use this one table (never Caddy's database).
-- If the account "aws"@"%" already exists, only the GRANT line is needed. To create it from scratch,
-- remove the leading "-- ", choose your own password (no spaces, quotes or # character), and run it:
-- CREATE USER IF NOT EXISTS 'aws'@'%' IDENTIFIED BY 'choose-your-password-here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON aws_iam_platform.visitors TO 'aws'@'%';
-- FLUSH PRIVILEGES;
-- Check with:  SHOW GRANTS FOR 'aws'@'%';
