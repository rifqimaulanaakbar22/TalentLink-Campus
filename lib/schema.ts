import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

export const students = sqliteTable(
  "students",
  {
    id: integer("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    prodi: text("prodi").notNull(),
    semester: integer("semester").notNull(),
    status: text("status", { enum: ["aktif", "cuti", "lulus"] }).notNull(),
    activeCommitments: integer("active_commitments").notNull().default(0),
  },
  (t) => [index("idx_students_status_semester").on(t.status, t.semester)],
);

export const skills = sqliteTable("skills", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  aliases: text("aliases").notNull().default("[]"), // JSON string[]
});

export const evidence = sqliteTable(
  "evidence",
  {
    id: text("id").primaryKey(), // EV-001
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    type: text("type", {
      enum: ["course", "project", "certificate", "award", "assistant", "research"],
    }).notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    grade: text("grade", { enum: ["A", "B", "C"] }),
    year: integer("year").notNull(),
    sourceLabel: text("source_label").notNull().default("Sintetis"),
  },
  (t) => [index("idx_evidence_student").on(t.studentId)],
);

export const evidenceSkills = sqliteTable(
  "evidence_skills",
  {
    evidenceId: text("evidence_id")
      .notNull()
      .references(() => evidence.id),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id),
    strength: integer("strength").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.evidenceId, t.skillId] }),
    // search memfilter per skill lalu join ke evidence.
    index("idx_evidence_skills_skill").on(t.skillId, t.evidenceId),
  ],
);

export const runs = sqliteTable(
  "runs",
  {
    id: integer("id").primaryKey(),
    workerId: text("worker_id", { enum: ["netra", "jaya", "kanca"] }).notNull(),
    skill: text("skill", { enum: ["research", "competition"] }).notNull(),
    mode: text("mode", { enum: ["v1", "v2"] }).notNull(),
    briefText: text("brief_text").notNull(),
    criteriaJson: text("criteria_json"),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    resultJson: text("result_json"),
    errorMessage: text("error_message"),
  },
  (t) => [index("idx_runs_created").on(t.createdAt)],
);

export const runSteps = sqliteTable(
  "run_steps",
  {
    id: integer("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id),
    step: text("step").notNull(),
    status: text("status", { enum: ["running", "done", "failed", "skipped"] }).notNull(),
    startedAt: text("started_at").notNull(),
    endedAt: text("ended_at"),
    detail: text("detail"),
  },
  (t) => [index("idx_run_steps_run").on(t.runId, t.id)],
);

export const tokenLedger = sqliteTable(
  "token_ledger",
  {
    id: integer("id").primaryKey(),
    runId: integer("run_id").references(() => runs.id),
    step: text("step").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    isEstimate: integer("is_estimate").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_token_ledger_run").on(t.runId)],
);

export const approvals = sqliteTable(
  "approvals",
  {
    id: integer("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id),
    candidateIds: text("candidate_ids").notNull(), // JSON string[]
    decision: text("decision", { enum: ["approved", "rejected"] }).notNull(),
    decidedBy: text("decided_by").notNull(),
    decidedAt: text("decided_at").notNull(),
    messageDraft: text("message_draft"),
    sentAt: text("sent_at"),
  },
  (t) => [index("idx_approvals_run").on(t.runId, t.id)],
);

// ---------- Autentikasi (fitur login) ----------

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(), // disimpan huruf kecil
  name: text("name").notNull(),
  role: text("role", { enum: ["dosen", "kemahasiswaan"] }).notNull(),
  passwordHash: text("password_hash").notNull(), // scrypt$N$r$p$salt$hash
  createdAt: text("created_at").notNull(),
  lastLoginAt: text("last_login_at"),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // SHA-256 dari token di cookie, bukan token itu sendiri
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);
