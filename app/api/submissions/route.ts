import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getPool } from "@/lib/db";
import type { SubmissionRecord } from "@/store/useAlgoStore";

type CreateSubmissionBody = Omit<SubmissionRecord, "createdAt"> & {
  sessionId?: string;
  createdAt?: string;
};

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    await ensureSchema();
    const result = await getPool().query(
      `
      select id, language, code, stdin, output, runtime, memory, verdict, created_at
      from submissions
      where session_id = $1
      order by created_at desc
      limit 50
      `,
      [sessionId],
    );

    return NextResponse.json({
      submissions: result.rows.map((row) => ({
        id: row.id,
        language: row.language,
        code: row.code,
        stdin: row.stdin,
        output: row.output,
        runtime: row.runtime,
        memory: row.memory,
        verdict: row.verdict,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load submissions." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSubmissionBody;
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    await ensureSchema();
    await getPool().query(
      `
      insert into submissions (
        id, session_id, language, code, stdin, output, runtime, memory, verdict, created_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      on conflict (id) do nothing
      `,
      [
        body.id,
        body.sessionId,
        body.language,
        body.code,
        body.stdin,
        body.output,
        body.runtime,
        body.memory,
        body.verdict,
        body.createdAt ? new Date(body.createdAt) : new Date(),
      ],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save submission." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    await ensureSchema();
    await getPool().query("delete from submissions where session_id = $1", [sessionId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not clear submissions." },
      { status: 500 },
    );
  }
}
