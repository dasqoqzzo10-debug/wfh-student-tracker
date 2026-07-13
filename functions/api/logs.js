// --- Cloudflare Pages Function: /api/logs ---

export async function onRequestGet(context) {
    const db = context.env.DB;
    if (!db) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' is missing." }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(context.request.url);
    const studentId = url.searchParams.get("studentId");

    if (!studentId) {
        return new Response(JSON.stringify({ error: "Missing query param: studentId" }), {
            status: 400, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const { results } = await db.prepare(
            "SELECT * FROM logs WHERE student_id = ? ORDER BY date ASC"
        ).bind(studentId).all();
        return new Response(JSON.stringify(results), {
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
        const {
            action,
            studentId,
            date,
            clockIn,
            clockOut,
            note,
            feedback,
            approvedBy,
            approvedDate
        } = data;

        if (!studentId) {
            return new Response(JSON.stringify({ error: "Missing field: studentId" }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // Action logic switch
        switch (action) {
            case "clock_in": {
                if (!date || !clockIn) {
                    return new Response(JSON.stringify({ error: "Missing field: date, clockIn" }), { status: 400 });
                }
                // Check if already checked in
                const exists = await db.prepare("SELECT date FROM logs WHERE student_id = ? AND date = ?").bind(studentId, date).first();
                if (exists) {
                    return new Response(JSON.stringify({ error: "ลงเวลาซ้ำ! วันนี้มีการบันทึกเวลาทำงานไปแล้ว" }), { status: 400 });
                }

                await db.prepare(
                    "INSERT INTO logs (student_id, date, clock_in, clock_out, note, status, feedback) VALUES (?, ?, ?, '', ?, 'pending', '')"
                ).bind(studentId, date, clockIn, note || "").run();
                break;
            }

            case "clock_out": {
                if (!date || !clockOut) {
                    return new Response(JSON.stringify({ error: "Missing field: date, clockOut" }), { status: 400 });
                }
                const log = await db.prepare("SELECT status FROM logs WHERE student_id = ? AND date = ?").bind(studentId, date).first();
                if (log && log.status === "approved") {
                    return new Response(JSON.stringify({ error: "รายการถูกล็อกเนื่องจากผ่านการอนุมัติแล้ว" }), { status: 400 });
                }

                await db.prepare(
                    "UPDATE logs SET clock_out = ?, note = ?, status = 'pending', feedback = '' WHERE student_id = ? AND date = ?"
                ).bind(clockOut, note || "", studentId, date).run();
                break;
            }

            case "manual_save": {
                if (!date || !clockIn || !clockOut) {
                    return new Response(JSON.stringify({ error: "Missing fields for manual save" }), { status: 400 });
                }
                const log = await db.prepare("SELECT status FROM logs WHERE student_id = ? AND date = ?").bind(studentId, date).first();
                if (log && log.status === "approved") {
                    return new Response(JSON.stringify({ error: "รายการถูกล็อกเนื่องจากผ่านการอนุมัติแล้ว" }), { status: 400 });
                }

                await db.prepare(`
                    INSERT INTO logs (student_id, date, clock_in, clock_out, note, status, feedback, approved_by, approved_date) 
                    VALUES (?, ?, ?, ?, ?, 'pending', '', '', '')
                    ON CONFLICT(student_id, date) 
                    DO UPDATE SET clock_in = excluded.clock_in, clock_out = excluded.clock_out, note = excluded.note, status = 'pending', feedback = ''
                `).bind(studentId, date, clockIn, clockOut, note || "").run();
                break;
            }

            case "approve": {
                if (!date || !approvedBy) {
                    return new Response(JSON.stringify({ error: "Missing field: date, approvedBy" }), { status: 400 });
                }
                await db.prepare(
                    "UPDATE logs SET status = 'approved', feedback = '', approved_by = ?, approved_date = ? WHERE student_id = ? AND date = ?"
                ).bind(approvedBy, approvedDate || "", studentId, date).run();
                break;
            }

            case "reject": {
                if (!date || !feedback) {
                    return new Response(JSON.stringify({ error: "Missing field: date, feedback" }), { status: 400 });
                }
                await db.prepare(
                    "UPDATE logs SET status = 'rejected', feedback = ?, approved_by = '', approved_date = '' WHERE student_id = ? AND date = ?"
                ).bind(feedback, studentId, date).run();
                break;
            }

            case "unlock": {
                if (!date) {
                    return new Response(JSON.stringify({ error: "Missing field: date" }), { status: 400 });
                }
                await db.prepare(
                    "UPDATE logs SET status = 'pending', approved_by = '', approved_date = '' WHERE student_id = ? AND date = ?"
                ).bind(studentId, date).run();
                break;
            }

            case "approve_all": {
                if (!approvedBy) {
                    return new Response(JSON.stringify({ error: "Missing field: approvedBy" }), { status: 400 });
                }
                await db.prepare(
                    "UPDATE logs SET status = 'approved', feedback = '', approved_by = ?, approved_date = ? WHERE student_id = ? AND status != 'approved'"
                ).bind(approvedBy, approvedDate || "", studentId).run();
                break;
            }

            default:
                return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true, message: `Action '${action}' executed successfully.` }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestDelete(context) {
    const db = context.env.DB;
    if (!db) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' is missing." }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(context.request.url);
    const studentId = url.searchParams.get("studentId");
    const date = url.searchParams.get("date");

    if (!studentId || !date) {
        return new Response(JSON.stringify({ error: "Missing query params: studentId, date" }), {
            status: 400, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const log = await db.prepare("SELECT status FROM logs WHERE student_id = ? AND date = ?").bind(studentId, date).first();
        if (log && log.status === "approved") {
            return new Response(JSON.stringify({ error: "รายการถูกล็อกเนื่องจากผ่านการอนุมัติแล้ว ไม่สามารถลบได้" }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        await db.prepare("DELETE FROM logs WHERE student_id = ? AND date = ?").bind(studentId, date).run();
        return new Response(JSON.stringify({ success: true, message: "Log entry deleted successfully." }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
}
