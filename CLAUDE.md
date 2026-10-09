# TalentLink Campus — aturan untuk AI coding assistant
- Baca PRD dan spesifikasi MVP sebelum mengubah arsitektur.
- JANGAN menjalankan git commit, git push, git merge, atau git rebase.
  Setelah satu tugas selesai: berhenti, ringkas perubahan, tampilkan perintah
  git yang disarankan untuk dijalankan manusia, dan ingatkan untuk commit.
- Pesan commit: Conventional Commits berbahasa Indonesia, tanpa trailer
  Co-Authored-By atau tautan Claude.
- Frontend: ikuti skill talentlink-ui dan frontend-design.
- Backend: ikuti skill backend-efisien; LLM hanya lewat lib/llm.ts.
- Testing: test dulu untuk logika inti; npm test harus lulus sebelum menyarankan commit.
- Jangan membaca atau menulis file .env.
- Next.js 16: baca panduan di node_modules/next/dist/docs/ sebelum memakai API Next (lihat AGENTS.md).
