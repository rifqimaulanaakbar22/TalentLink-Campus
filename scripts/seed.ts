// npm run seed — hapus lalu isi ulang database secara deterministik (data Sintetis).
import { getSqlite } from "../lib/db";
import { seedDatabase } from "../lib/seed";

const db = getSqlite();
const counts = seedDatabase(db);
console.log("Seed selesai (data Sintetis, deterministik).");
for (const [t, n] of Object.entries(counts)) console.log(`  ${t.padEnd(16)} ${n}`);
const { cuti } = db.prepare("SELECT count(*) AS cuti FROM students WHERE status = 'cuti' AND id <= 80").get() as { cuti: number };
console.log(`  mahasiswa cuti (S-001..S-080): ${cuti}`);
