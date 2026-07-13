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
            // Update existing profile
            await db.prepare(
                "UPDATE students SET name = ?, dept = ?, advisor = ?, company = ? WHERE id = ?"
            ).bind(name, dept || "", advisor || "", company || "", id).run();
            
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
