pub mod schema;

use rusqlite::{Connection, Result};
use std::path::Path;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: &Path) -> Result<Self> {
        let conn = Connection::open(db_path)?;

        // Performance pragmas for better query performance
        conn.execute_batch(r#"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA cache_size = -64000;
            PRAGMA temp_store = MEMORY;
            PRAGMA mmap_size = 268435456;
            PRAGMA foreign_keys = ON;
        "#)?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        db.initialize()?;
        Ok(db)
    }

    fn initialize(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(schema::CREATE_TABLES)?;

        // Run migrations for existing databases
        self.run_migrations(&conn)?;

        Ok(())
    }

    fn run_migrations(&self, conn: &Connection) -> Result<()> {
        // Migration: Add deleted_at column if it doesn't exist
        let has_deleted_at: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('items') WHERE name = 'deleted_at'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !has_deleted_at {
            conn.execute(
                "ALTER TABLE items ADD COLUMN deleted_at INTEGER DEFAULT NULL",
                [],
            )?;
        }

        Ok(())
    }
}
