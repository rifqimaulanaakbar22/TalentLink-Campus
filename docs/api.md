# API TalentLink Campus: contoh request dan response

Bentuk data mengikat ada di `docs/kontrak-frontend-backend.md` bagian 4 dan `lib/api-types.ts`. Berkas ini hanya contoh nyata untuk uji cepat dengan curl. Semua error berbentuk `{ "error": "pesan" }`.

Menjalankan server lokal tanpa memakai token CBN:

```bash
npm run seed
LLM_MOCK=true npm run dev        # http://localhost:3000
```

Contoh di bawah memakai `B=http://localhost:3000`.

## Alur utama: buat run → polling → approve → send

```bash
# 1. Buat run (pipeline jalan di background)
curl -X POST $B/api/runs -H 'Content-Type: application/json' \
  -d '{"workerId":"netra","brief":"Butuh 2 mahasiswa Python dan Computer Vision untuk riset deteksi objek","mode":"v2"}'
# 201 {"runId":1}

# 2. Polling tiap 1 detik selama status queued/running
curl $B/api/runs/1
# 200 {"run":{"id":1,"status":"awaiting_approval",...},"steps":[...7 langkah],"totalTokens":0,
#      "result":{"candidates":[{"code":"S-101","score":100,...}],...},"approval":null,"budgetWarning":false}

# 3. Setujui kandidat
curl -X POST $B/api/runs/1/approve -H 'Content-Type: application/json' \
  -d '{"decision":"approved","candidateCodes":["S-101","S-104"],"messageDraft":"Yth. [Nama Mahasiswa], ..."}'
# 200 {"decision":"approved","candidateCodes":["S-101","S-104"],"messageDraft":"...","decidedBy":"Dosen pemberi tugas",
#      "decidedAt":"2026-10-09T15:08:25.778Z","sentAt":null}

# 4. Kirim undangan SIMULASI (aman dipanggil ulang; sentAt tidak berubah)
curl -X POST $B/api/runs/1/send
# 200 {"sentAt":"2026-10-09T15:08:25.812Z","label":"SIMULASI"}
```

## Semua endpoint

| Request | Sukses | Error yang mungkin |
| --- | --- | --- |
| `GET /api/worker` | 200 `{workers:[{id:"netra",status:"siap",tokensUsed:0,...}], usage:{total,budget:10000000,percent,warn,stop,byWorker}}` | |
| `POST /api/runs` `{workerId, brief, mode}` | 201 `{runId}` | 400 `Brief terlalu pendek, minimal 15 karakter.` · 400 `Digital Worker ini segera hadir dan belum bisa diberi tugas.` · 400 `Body permintaan harus berupa JSON yang valid.` |
| `GET /api/runs` | 200 `{runs:[{id,workerId,briefPreview,mode,status,createdAt,totalTokens,errorMessage}]}`, 20 terbaru | |
| `GET /api/runs/:id` | 200 `RunDetailResponse` | 404 `Penugasan tidak ditemukan.` · 400 `ID penugasan tidak valid.` |
| `POST /api/runs/:id/clarify` `{answer}` | 200 `{runId, status:"queued"}` | 409 `Penugasan ini tidak sedang menunggu klarifikasi.` |
| `POST /api/runs/:id/approve` `{decision, candidateCodes, messageDraft}` | 200 `ApprovalView` | 409 `Penugasan ini tidak sedang menunggu persetujuan.` · 400 `Kandidat S-108 tidak ada di Link Brief penugasan ini.` · 400 `Pilih minimal satu kandidat untuk disetujui.` |
| `POST /api/runs/:id/send` | 200 `{sentAt, label:"SIMULASI"}` | 403 `Butuh persetujuan dosen` (belum disetujui atau ditolak) |
| `POST /api/runs/:id/retry` | 200 `{runId, status:"queued"}` | 409 `Hanya penugasan yang gagal yang bisa dicoba lagi.` |
| `GET /api/evidence/:id` | 200 `{id:"EV-449",type:"project",title,detail,grade,year,sourceLabel:"Sintetis",studentCode:"S-101",skills:[...]}` | 404 `Bukti tidak ditemukan.` · 400 `ID bukti tidak valid.` |
| `GET /api/scorecard` | 200 `{empty:true,hint:"Jalankan npm run eval"}` atau isi `eval/results.json` | |

## Perilaku yang perlu diketahui frontend

- **Clarify:** jawaban ditambahkan ke brief sebagai `"\n\nJawaban klarifikasi: …"`, lalu run diantrekan ulang dan parse dijalankan lagi.
- **Retry:** baris langkah lama tetap ada. Frontend menampilkan baris terakhir per nama langkah. Parse dilewati jika kriteria sudah tersimpan.
- **Token per langkah:** dari `token_ledger`, dicocokkan dengan nama langkah dan rentang waktunya. Retry explain tercatat di langkah `verify`.
- **Error API CBN** (401, 429, timeout, budget habis) muncul sebagai langkah `failed` dan `run.errorMessage`, misalnya `Batas permintaan API CBN tercapai, coba lagi sebentar`.
- **Skenario uji mock:** `LLM_MOCK_SCENARIO=fake_ids` (ID bukti palsu → alasan template) dan `LLM_MOCK_SCENARIO=bad_json` (JSON rusak → alasan template).

## Jaya (Competition Matching)

Endpoint sama. `brief` berisi teks guidebook lomba (maksimal 20.000 karakter); `mode` diabaikan karena Jaya selalu memakai jalur hemat. Bentuk tambahan di `result` dijelaskan di kontrak bagian "Tambahan: Competition Matching oleh Jaya".

```bash
curl -X POST $B/api/runs -H 'Content-Type: application/json' \
  -d '{"workerId":"jaya","brief":"Lomba Inovasi AI Nasional 2026. Mahasiswa aktif semester 3 sampai 7. Tim 3 orang, maksimal 2 tim. Peran: pengembang model AI (Python, Deep Learning), pengembang aplikasi web, presenter.","mode":"v2"}'
# 201 {"runId":5}

curl $B/api/runs/5
# result.candidates  -> anggota semua tim, masing-masing dengan role dan team
# result.competition -> {competitionName, teamSize, teamCount, rules, screenedCount, eligibleCount,
#                        excluded:[{code, reasons}], teams:[{team, members, missingRoles}], conflicts:[...]}
```

Uji tanpa UI: `npm run cli -- --sample ai-nasional` atau `npm run cli -- --worker jaya --file guidebook.txt`.

Catatan mode mock frontend (`NEXT_PUBLIC_API_MOCK=true`): `app/_lib/mock-store.ts` masih menolak Jaya. Uji alur Jaya dengan API asli (`LLM_MOCK=true npm run dev` cukup untuk tanpa token).
