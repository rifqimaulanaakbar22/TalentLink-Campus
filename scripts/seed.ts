// npm run seed — hapus lalu isi ulang database secara deterministik (data Sintetis).
// Token Ledger dipertahankan; tambahkan `-- --reset-ledger` untuk ikut mengosongkannya.
// Lokal: data/talentlink.db. Jika TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN diisi: database Turso.
import { getDb } from "../lib/db";
import { seedDatabase } from "../lib/seed";

async function main() {
  const db = await getDb();
  const resetLedger = process.argv.includes("--reset-ledger");
  const counts = await seedDatabase(db, { resetLedger });
  console.log(`Seed selesai (data Sintetis, deterministik) ke ${process.env.TURSO_DATABASE_URL ? "Turso" : "file lokal"}.`);
  for (const [t, n] of Object.entries(counts)) console.log(`  ${t.padEnd(16)} ${n}`);
  const { cuti } = (await db.get<{ cuti: number }>(
    "SELECT count(*) AS cuti FROM students WHERE status = 'cuti' AND id <= 80",
  ))!;
  console.log(`  mahasiswa cuti (S-001..S-080): ${cuti}`);
  const { tokens } = (await db.get<{ tokens: number }>(
    "SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens FROM token_ledger",
  ))!;
  console.log(
    resetLedger
      ? "  token_ledger dikosongkan (--reset-ledger)."
      : `  token_ledger dipertahankan: ${tokens.toLocaleString("id-ID")} token CBN tetap terhitung di budget.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
