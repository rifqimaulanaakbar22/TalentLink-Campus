# ERD database TalentLink Campus

Sumber kebenaran: `lib/schema.ts` dan DDL di `lib/db.ts`. Satu file SQLite (`data/talentlink.db`), dibuat otomatis saat pertama dibuka dan diisi lewat `npm run seed`.

```mermaid
erDiagram
    students ||--o{ evidence : "punya"
    evidence ||--o{ evidence_skills : "membuktikan"
    skills   ||--o{ evidence_skills : "dibuktikan oleh"
    runs     ||--o{ run_steps : "terdiri dari"
    runs     |o--o{ token_ledger : "memakai token"
    runs     ||--o{ approvals : "diputuskan lewat"

    students {
        INTEGER id PK
        TEXT code UK "S-001"
        TEXT name "tidak dipakai saat scoring"
        TEXT prodi
        INTEGER semester
        TEXT status "aktif | cuti | lulus"
        INTEGER active_commitments "Fair Exposure jika >= 2"
    }

    skills {
        INTEGER id PK
        TEXT name UK "Computer Vision"
        TEXT aliases "JSON: CV, Pengolahan Citra"
    }

    evidence {
        TEXT id PK "EV-001"
        INTEGER student_id FK
        TEXT type "course | project | certificate | award | assistant | research"
        TEXT title
        TEXT detail
        TEXT grade "A | B | C, hanya course"
        INTEGER year
        TEXT source_label "Sintetis"
    }

    evidence_skills {
        TEXT evidence_id PK, FK
        INTEGER skill_id PK, FK
        INTEGER strength "1..3"
    }

    runs {
        INTEGER id PK
        TEXT worker_id "netra | jaya (kanca: roadmap)"
        TEXT skill "research | competition"
        TEXT mode "v1 | v2"
        TEXT brief_text
        TEXT criteria_json "hasil parse"
        TEXT status "queued ... failed"
        TEXT created_at
        TEXT updated_at
        TEXT result_json "RunResult"
        TEXT error_message
    }

    run_steps {
        INTEGER id PK
        INTEGER run_id FK
        TEXT step "parse ... brief"
        TEXT status "running | done | failed | skipped"
        TEXT started_at
        TEXT ended_at
        TEXT detail "kalimat bersuara worker"
    }

    token_ledger {
        INTEGER id PK
        INTEGER run_id FK "boleh kosong"
        TEXT step
        TEXT model
        INTEGER input_tokens
        INTEGER output_tokens
        INTEGER latency_ms
        INTEGER is_estimate "1 jika tanpa field usage"
        TEXT created_at
    }

    approvals {
        INTEGER id PK
        INTEGER run_id FK
        TEXT candidate_ids "JSON kode mahasiswa"
        TEXT decision "approved | rejected"
        TEXT decided_by
        TEXT decided_at
        TEXT message_draft
        TEXT sent_at "terisi setelah kirim SIMULASI"
    }
```

## Dua kelompok tabel

| Kelompok | Tabel | Sifat |
| --- | --- | --- |
| Talent Graph | `students`, `skills`, `evidence`, `evidence_skills` | Hanya diisi oleh seed. Worker dan API **read-only** |
| Jejak run | `runs`, `run_steps`, `token_ledger`, `approvals` | Ditulis oleh pipeline dan API; membuat hasil tetap ada setelah refresh |

`evidence_skills` adalah sisi graph: satu bukti bisa membuktikan beberapa skill dengan kekuatan berbeda. Skor kandidat dihitung dari sini (`strength/3 × w_type × w_recency`, ambil yang terbaik per skill).

## Relasi logis tanpa foreign key

- `runs.worker_id` merujuk ke `id` di `lib/workers.json`, bukan tabel.
- `approvals.candidate_ids` dan `runs.result_json` menyimpan kode mahasiswa (`S-101`) dan ID bukti (`EV-012`) sebagai JSON.
- `token_ledger.run_id` boleh kosong agar panggilan LLM di luar run tetap tercatat di budget.

## Indeks

| Indeks | Untuk |
| --- | --- |
| `students(status, semester)` | Filter kandidat aktif dan semester minimum |
| `evidence(student_id)` | Join bukti per mahasiswa |
| `evidence_skills(skill_id, evidence_id)` | Search per skill |
| `run_steps(run_id, id)` | Timeline berurutan |
| `token_ledger(run_id)` | Token per run dan per langkah |
| `approvals(run_id, id)` | Approval terakhir |
| `runs(created_at)` | Daftar 20 run terbaru |
