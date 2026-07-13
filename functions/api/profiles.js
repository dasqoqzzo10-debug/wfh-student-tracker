// --- Cloudflare Pages Function: /api/profiles ---

export async function onRequestGet(context) {
    const db = context.env.DB;
    
    if (!db) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' is missing." }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const { results } = await db.prepare("SELECT * FROM students").all();
        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPost(context) {
    const db = context.env.DB;
    
    if (!db) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' is missing." }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const data = await context.request.json();
        const { id, name, dept, advisor, company, action } = data;

        if (!id || !name) {
            return new Response(JSON.stringify({ error: "Missing required fields: id, name" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "edit") {
            const { oldId } = data;

            if (!oldId) {
                return new Response(JSON.stringify({ error: "Missing required field: oldId for edit action" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // ถ้ารหัสเปลี่ยน (ID Changed)
            if (id !== oldId) {
                // 1. ตรวจสอบรหัสใหม่ซ้ำหรือไม่
                const duplicate = await db.prepare("SELECT id FROM students WHERE id = ?").bind(id).first();
                if (duplicate) {
                    return new Response(JSON.stringify({ error: "รหัสนักศึกษาใหม่นี้มีอยู่ในระบบแล้ว" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }
                
                // 2. อัปเดตตารางประวัติเวลา (logs) ให้ย้ายมารหัสใหม่ก่อน
                await db.prepare("UPDATE logs SET student_id = ? WHERE student_id = ?").bind(id, oldId).run();
                
                // 3. อัปเดตตารางนักศึกษา (students) โดยการเปลี่ยน ID
                await db.prepare(
                    "UPDATE students SET id = ?, name = ?, dept = ?, advisor = ?, company = ? WHERE id = ?"
                ).bind(id, name, dept || "", advisor || "", company || "", oldId).run();
            } else {
                // รหัสเดิม อัปเดตเฉพาะข้อมูลปกติ
                await db.prepare(
                    "UPDATE students SET name = ?, dept = ?, advisor = ?, company = ? WHERE id = ?"
                ).bind(name, dept || "", advisor || "", company || "", id).run();
            }
            
            return new Response(JSON.stringify({ success: true, message: "Profile updated successfully." }), {
                headers: { "Content-Type": "application/json" }
            });
        } else {
            // Check for duplicate ID
            const duplicate = await db.prepare("SELECT id FROM students WHERE id = ?").bind(id).first();
            if (duplicate) {
                return new Response(JSON.stringify({ error: "รหัสนักศึกษานี้มีอยู่ในระบบแล้ว (Student ID already exists)" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // Create new profile
            await db.prepare(
                "INSERT INTO students (id, name, dept, advisor, company) VALUES (?, ?, ?, ?, ?)"
            ).bind(id, name, dept || "", advisor || "", company || "").run();

            return new Response(JSON.stringify({ success: true, message: "Profile created successfully." }), {
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestDelete(context) {
    const db = context.env.DB;
    if (!db) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' is missing." }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return new Response(JSON.stringify({ error: "Missing query param: id" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        // ลบนักศึกษา (ข้อมูล logs จะถูกลบอ้อมผ่าน FOREIGN KEY ON DELETE CASCADE อัตโนมัติ)
        await db.prepare("DELETE FROM students WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true, message: "Student profile deleted successfully." }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
