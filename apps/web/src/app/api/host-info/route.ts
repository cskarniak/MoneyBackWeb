import os from 'node:os';
import { NextResponse } from 'next/server';

export async function GET() {
  const cpus = os.cpus();

  return NextResponse.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    cpuModel: cpus[0]?.model ?? null,
    cpuCount: cpus.length,
    totalMemGB: Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10,
  });
}
