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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
