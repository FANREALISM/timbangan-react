import configparser
import os

# Baca file config.ini dari direktori yang sama dengan script ini
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini")

config = configparser.ConfigParser()
config.read(CONFIG_FILE)


def get_db_type():
    """Kembalikan jenis database: 'mysql' atau 'sqlite'"""
    return config.get("database", "db_type", fallback="sqlite").strip().lower()


def get_mysql_config():
    """Kembalikan dictionary konfigurasi MySQL"""
    return {
        "host": config.get("database", "mysql_host", fallback="localhost"),
        "port": int(config.get("database", "mysql_port", fallback="3306")),
        "user": config.get("database", "mysql_user", fallback="root"),
        "password": config.get("database", "mysql_password", fallback=""),
        "database": config.get("database", "mysql_database", fallback="timbangan"),
    }


def get_sqlite_path():
    """Kembalikan path file database SQLite"""
    return config.get("database", "sqlite_path", fallback="timbangan.db")


def get_db_connection():
    """
    Buat dan kembalikan koneksi database sesuai konfigurasi.
    Mendukung MySQL dan SQLite.
    """
    db_type = get_db_type()

    if db_type == "mysql":
        try:
            import mysql.connector
            cfg = get_mysql_config()
            conn = mysql.connector.connect(
                host=cfg["host"],
                port=cfg["port"],
                user=cfg["user"],
                password=cfg["password"],
                database=cfg["database"],
            )
            print(f"[DB] Terhubung ke MySQL: {cfg['host']}:{cfg['port']} / {cfg['database']}")
            return conn
        except ImportError:
            raise ImportError(
                "mysql-connector-python belum terinstall. "
                "Jalankan: pip install mysql-connector-python"
            )

    elif db_type == "sqlite":
        import sqlite3
        path = get_sqlite_path()
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row  # agar hasil query bisa diakses seperti dict
        print(f"[DB] Terhubung ke SQLite: {path}")
        return conn

    else:
        raise ValueError(f"db_type tidak dikenali: '{db_type}'. Gunakan 'mysql' atau 'sqlite'.")


def get_server_config():
    """Kembalikan konfigurasi server"""
    return {
        "host": config.get("server", "host", fallback="localhost"),
        "port": int(config.get("server", "port", fallback="5000")),
        "debug": config.get("server", "debug", fallback="false").lower() == "true",
    }


# ── Contoh penggunaan ────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== Konfigurasi Database ===")
    print(f"Tipe DB  : {get_db_type()}")

    db_type = get_db_type()
    if db_type == "mysql":
        print(f"MySQL    : {get_mysql_config()}")
    else:
        print(f"SQLite   : {get_sqlite_path()}")

    print("\n=== Konfigurasi Server ===")
    print(f"Server   : {get_server_config()}")

    print("\n=== Test Koneksi ===")
    try:
        conn = get_db_connection()
        print("Koneksi berhasil!")
        conn.close()
    except Exception as e:
        print(f"Koneksi gagal: {e}")
