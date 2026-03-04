import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db;

export const initDB = async () => {
  db = await sqlite.createConnection("timbangan.db", false, "no-encryption", 1);
  await db.open();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      berat TEXT,
      tanggal TEXT
    );
  `);
};

export const simpanBerat = async (berat) => {
  const tanggal = new Date().toISOString();
  await db.run(
    "INSERT INTO transaksi (berat, tanggal) VALUES (?, ?)",
    [berat, tanggal]
  );
};
