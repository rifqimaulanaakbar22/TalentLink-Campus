// npm run seed — hapus lalu isi ulang database secara deterministik (data Sintetis).
// Token Ledger dipertahankan; tambahkan `-- --reset-ledger` untuk ikut mengosongkannya.
import { getSqlite } from "../lib/db";
import { seedDatabase } from "../lib/seed";

const db = getSqlite();
const resetLedger = process.argv.includes("--reset-ledger");
const counts = seedDatabase(db, { resetLedger });
console.log("Seed selesai (data Sintetis, deterministik).");
for (const [t, n] of Object.entries(counts)) console.log(`  ${t.padEnd(16)} ${n}`);
const { cuti } = db.prepare("SELECT count(*) AS cuti FROM students WHERE status = 'cuti' AND id <= 80").get() as { cuti: number };
console.log(`  mahasiswa cuti (S-001..S-080): ${cuti}`);
const { tokens } = db.prepare("SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens FROM token_ledger").get() as { tokens: number };
console.log(
  resetLedger
    ? "  token_ledger dikosongkan (--reset-ledger)."
    : `  token_ledger dipertahankan: ${tokens.toLocaleString("id-ID")} token CBN tetap terhitung di budget.`,
);
