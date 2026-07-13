-- ====================================================
-- Cloudflare D1 SQL Database Schema & Seed Data
-- Project: WFH Student Time Tracker
-- ====================================================

-- 1. Table: Students Profile
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dept TEXT DEFAULT '',
    advisor TEXT DEFAULT '',
    company TEXT DEFAULT ''
);

-- 2. Table: Attendance Logs
DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
    student_id TEXT,
    date TEXT,
    clock_in TEXT DEFAULT '',
    clock_out TEXT DEFAULT '',
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    feedback TEXT DEFAULT '',
    approved_by TEXT DEFAULT '',
    approved_date TEXT DEFAULT '',
    PRIMARY KEY (student_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 3. Table: App Settings (Supervisor configuration, security PIN)
DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ====================================================
-- SEED INITIAL DATA (ข้อมูลเริ่มต้น)
-- ====================================================

-- Insert initial 3 student profiles
INSERT INTO students (id, name, dept, advisor, company) VALUES 
('6601012301', 'นายกรวิชญ์ รักเรียน', 'วิทยาการคอมพิวเตอร์', 'อาจารย์กิตติพงษ์ สุขใจ', 'บริษัท เทคโนโลยีและนวัตกรรม จำกัด'),
('6601012302', 'นางสาวศิริพร บุญรอด', 'เทคโนโลยีสารสนเทศ', 'อาจารย์กิตติพงษ์ สุขใจ', 'บริษัท เทคโนโลยีและนวัตกรรม จำกัด'),
('6601012303', 'นายปกรณ์ มีทรัพย์', 'วิศวกรรมคอมพิวเตอร์', 'ดร.สมชาย สอนดี', 'บริษัท พัฒนาซอฟต์แวร์ จำกัด');

-- Insert default configurations
INSERT INTO settings (key, value) VALUES
('supervisor_pin', '1234'),
('supervisor_name', 'นายสมศักดิ์ รักมั่น (พี่เลี้ยง)'),
('supervisor_signature', 'สมศักดิ์ ร.');
