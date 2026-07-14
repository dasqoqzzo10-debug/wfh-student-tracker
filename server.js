const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = 8000;

// ให้เซิร์ฟเวอร์อ่านข้อมูลแบบ JSON ได้
app.use(express.json());

// ให้เซิร์ฟเวอร์แสดงไฟล์ HTML, CSS, JS ของคุณ
app.use(express.static(__dirname));

// --- 1. ตั้งค่าฐานข้อมูล SQLite ---
const dbFile = 'database.sqlite';
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) console.error("Error opening database:", err.message);
    else console.log("เชื่อมต่อฐานข้อมูล SQLite สำเร็จ!");
});

// รันไฟล์ schema.sql เพื่อสร้างตารางหากยังไม่มี
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) console.error("Error running schema:", err);
        else console.log("สร้าง/ตรวจสอบตารางฐานข้อมูลเรียบร้อย");
    });
} else {
    console.warn("ไม่พบไฟล์ schema.sql กรุณาตรวจสอบให้แน่ใจว่าไฟล์อยู่ในโฟลเดอร์เดียวกัน");
}

// --- 2. สร้าง API ให้ Frontend เรียกใช้ ---

// ดึงข้อมูลโปรไฟล์ทั้งหมด
app.get('/api/profiles', (req, res) => {
    db.all("SELECT * FROM students", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ดึงข้อมูลการลงเวลาของนักศึกษาแต่ละคน
app.get('/api/logs', (req, res) => {
    const studentId = req.query.studentId;
    db.all("SELECT * FROM logs WHERE student_id = ? ORDER BY date DESC", [studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// บันทึกและจัดการการลงเวลา
app.post('/api/logs', (req, res) => {
    const { action, studentId, date, clockIn, clockOut, note } = req.body;
    
    if (action === 'clock_in') {
        const sql = `INSERT INTO logs (student_id, date, clock_in, note, status) VALUES (?, ?, ?, ?, 'pending')`;
        db.run(sql, [studentId, date, clockIn, note], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "ลงเวลาเข้าสำเร็จ" });
        });
    } 
    else if (action === 'clock_out') {
        const sql = `UPDATE logs SET clock_out = ?, note = ? WHERE student_id = ? AND date = ?`;
        db.run(sql, [clockOut, note, studentId, date], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "ลงเวลาออกสำเร็จ" });
        });
    }
});

// ดึงการตั้งค่า PIN ของพี่เลี้ยง
app.get('/api/pin', (req, res) => {
    db.all("SELECT key, value FROM settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let settings = {};
        rows.forEach(row => { settings[row.key] = row.value; });
        
        res.json({
            supervisorName: settings.supervisor_name || 'พี่เลี้ยง',
            supervisorSignature: settings.supervisor_signature || 'ลายเซ็น'
        });
    });
});

// --- 3. เปิดเซิร์ฟเวอร์ ---
app.listen(port, () => {
    console.log(`🚀 เซิร์ฟเวอร์ทำงานแล้วที่ http://localhost:${port}`);
    console.log(`👉 เปิดบราวเซอร์แล้วไปที่: http://localhost:${port}`);
});