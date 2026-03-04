const mysql = require("mysql2");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

class Database {
  constructor(config) {
    this.config = config;
    this.db = null;
    this.type = config.db_type || "mysql";
    this.init();
  }

  init() {
    if (this.type === "mysql") {
      this.db = mysql.createPool({
        host: this.config.mysql_host,
        port: this.config.mysql_port || 3306,
        user: this.config.mysql_user,
        password: this.config.mysql_password,
        database: this.config.mysql_database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      console.log("MySQL connection pool initialized");
    } else if (this.type === "sqlite") {
      const dbPath =
        process.env.DB_PATH ||
        path.resolve(
          __dirname,
          "..",
          this.config.sqlite_path || "timbangan.db",
        );
      console.log("🗄️ Using SQLite DB at:", dbPath);
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("SQLite Connection Error:", err.message);
        } else {
          console.log(`Connected to SQLite database: ${dbPath}`);
          this.initializeSQLiteTables();
        }
      });
    }
  }

  initializeSQLiteTables() {
    const query = `
      CREATE TABLE IF NOT EXISTS timbangan_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        product_name TEXT NOT NULL,
        client_name TEXT,
        gross_weight REAL,
        unit_used TEXT
      );
    `;
    this.db.run(query, (err) => {
      if (err)
        console.error("SQLite table initialization failed:", err.message);
    });
  }

  query(sql, params, callback) {
    if (this.type === "mysql") {
      return this.db.query(sql, params, callback);
    } else {
      // Convert ? to $ for sqlite if needed? No, sqlite3 supports ? too.
      // But sqlite3 uses .all or .run depending on type
      const isInsert = sql.toLowerCase().startsWith("insert");
      if (isInsert) {
        this.db.run(sql, params, function (err) {
          if (err) return callback(err);
          callback(null, { insertId: this.lastID });
        });
      } else {
        this.db.all(sql, params, (err, rows) => {
          callback(err, rows);
        });
      }
    }
  }

  // Helper for index.js main connection test
  testConnection(callback) {
    if (this.type === "mysql") {
      this.db.getConnection((err, connection) => {
        if (err) return callback(err);
        connection.release();
        callback(null);
      });
    } else {
      this.db.get("SELECT 1", (err) => {
        callback(err);
      });
    }
  }
}

module.exports = Database;
