// --- Cloudflare Pages Function: /api/pin (Settings & Authentication) ---

export async function onRequestGet(context) {
    const db = context.env.DB;
    if (!db) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' is missing." }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const rows = await db.prepare("SELECT key, value FROM settings WHERE key IN ('supervisor_name', 'supervisor_signature')").all();
        const settings = {};
        
        // Default fallbacks if empty
        settings.supervisorName = "นายสมศักดิ์ รักมั่น (พี่เลี้ยง)";
        settings.supervisorSignature = "สมศักดิ์ ร.";

        rows.results.forEach(row => {
            if (row.key === "supervisor_name") settings.supervisorName = row.value;
            if (row.key === "supervisor_signature") settings.supervisorSignature = row.value;
        });

        return new Response(JSON.stringify(settings), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPost(context) {
    const db = context.env.DB;
    if (!db) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' is missing." }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const data = await context.request.json();
        const { action, pin, oldPin, newPin, name, signature } = data;

        switch (action) {
            case "verify_pin": {
                if (!pin) {
                    return new Response(JSON.stringify({ error: "Missing PIN code" }), { status: 400 });
                }
                const row = await db.prepare("SELECT value FROM settings WHERE key = 'supervisor_pin'").first();
                const actualPin = row ? row.value : "1234";

                if (pin === actualPin) {
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { "Content-Type": "application/json" }
                    });
                } else {
                    return new Response(JSON.stringify({ success: false, error: "รหัสผ่านไม่ถูกต้อง" }), {
                        headers: { "Content-Type": "application/json" }
                    });
                }
            }

            case "change_pin": {
                if (!oldPin || !newPin) {
                    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
                }
                const row = await db.prepare("SELECT value FROM settings WHERE key = 'supervisor_pin'").first();
                const actualPin = row ? row.value : "1234";

                if (oldPin !== actualPin) {
                    return new Response(JSON.stringify({ error: "รหัสผ่านเดิมไม่ถูกต้อง" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                await db.prepare(
                    "INSERT INTO settings (key, value) VALUES ('supervisor_pin', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
                ).bind(newPin).run();

                return new Response(JSON.stringify({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" }), {
                    headers: { "Content-Type": "application/json" }
                });
            }

            case "update_signature": {
                if (!name || !signature) {
                    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
                }

                await db.prepare(
                    "INSERT INTO settings (key, value) VALUES ('supervisor_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
                ).bind(name).run();

                await db.prepare(
                    "INSERT INTO settings (key, value) VALUES ('supervisor_signature', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
                ).bind(signature).run();

                return new Response(JSON.stringify({ success: true, message: "อัปเดตข้อมูลการรับรองและลายเซ็นเรียบร้อย" }), {
                    headers: { "Content-Type": "application/json" }
                });
            }

            default:
                return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), { status: 400 });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
}
