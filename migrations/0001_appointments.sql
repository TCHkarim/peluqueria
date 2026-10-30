CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  appointment_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pendiente'
    CHECK (status IN ('Pendiente','Confirmado','Cancelado','Realizado')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date, start_time);
