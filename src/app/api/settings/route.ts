import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import {
  ForbiddenError,
  forbiddenResponse,
  getWorkspaceContext,
  requirePermission,
  UnauthorizedError,
  unauthorizedResponse,
} from '@/lib/auth';

export async function GET() {
  try {
    const ctx = await getWorkspaceContext();
    const db = await getDb();

    // Per-user settings only.
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT setting_key, setting_value FROM settings WHERE owner_id = ?",
      [ctx.dataOwnerId],
    );

    const mergedSettings: Record<string, unknown> = {};
    for (const row of rows) {
      // In mysql2, JSON columns might already be parsed, or they might be strings.
      // If it's a string, we parse it. If it's an object, we use it directly.
      const value = typeof row.setting_value === "string"
        ? JSON.parse(row.setting_value)
        : row.setting_value;

      mergedSettings[row.setting_key] = value;
    }

    return NextResponse.json(mergedSettings);
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_settings');
    const { section, data } = await req.json();

    if (!section || !data) {
      return NextResponse.json(
        { error: "Missing section or data" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Convert data to JSON string for storage
    const dataString = JSON.stringify(data);

    await db.execute(
      `INSERT INTO settings (setting_key, setting_value, owner_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [section, dataString, ctx.dataOwnerId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
