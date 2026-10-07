import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runLeaseStatusJobs } from "@/lib/lease-status-jobs";

// Jobs touch every lease: never cache, always run on the server
export const dynamic = "force-dynamic";

function hasValidCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// Scheduler (Authorization: Bearer CRON_SECRET) or an ADMIN triggering it manually
async function isAuthorized(request: NextRequest) {
  if (hasValidCronSecret(request)) return true;
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

async function handle(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const report = await runLeaseStatusJobs(prisma);

  // A failing job makes the scheduler report the run as failed
  return NextResponse.json(report, { status: report.errors.length > 0 ? 500 : 200 });
}

// GET for schedulers that only send GET requests (e.g. Vercel Cron), POST otherwise
export const GET = handle;
export const POST = handle;
