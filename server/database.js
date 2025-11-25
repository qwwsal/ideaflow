const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Для Vercel используем /tmp для хранения БД (единственное доступное место для записи)
// Для локальной разработки используем обычный путь
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/mydatabase.db'
  : path.join(__dirname, 'mydatabase.db');

// Создаем папку если нужно (особенно важно для Vercel /tmp)
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log('Created database directory:', dir);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка при открытии базы данных:', err.message);
  } else {
    console.log('База данных успешно открыта:', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        photo TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Ошибка создания таблицы Users:', err.message);
      else console.log('Таблица Users готова');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS Cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT,
        status TEXT DEFAULT 'open',
        executorId INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `, (err) => {
      if (err) console.error('Ошибка создания таблицы Cases:', err.message);
      else console.log('Таблица Cases готова');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS ProcessedCases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caseId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT,
        status TEXT DEFAULT 'in_process',
        executorId INTEGER,
        executorEmail TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(caseId) REFERENCES Cases(id),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `, (err) => {
      if (err) console.error('Ошибка создания таблицы ProcessedCases:', err.message);
      else console.log('Таблица ProcessedCases готова');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS Projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caseId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT,
        status TEXT DEFAULT 'closed',
        executorEmail TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES Users(id),
        FOREIGN KEY(caseId) REFERENCES Cases(id)
      )
    `, (err) => {
      if (err) console.error('Ошибка создания таблицы Projects:', err.message);
      else console.log('Таблица Projects готова');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS Reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        reviewerId INTEGER NOT NULL,
        reviewerName TEXT,
        reviewerPhoto TEXT,
        text TEXT NOT NULL,
        rating INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES Users(id),
        FOREIGN KEY(reviewerId) REFERENCES Users(id)
      )
    `, (err) => {
      if (err) console.error('Ошибка создания таблицы Reviews:', err.message);
      else console.log('Таблица Reviews готова');
    });

    // Проверяем и добавляем отсутствующие колонки
    setTimeout(() => {
      checkAndAddColumns();
    }, 1000);
  });
}

function checkAndAddColumns() {
  // Проверяем наличие колонки executorId в ProcessedCases
  db.all("PRAGMA table_info(ProcessedCases)", (err, rows) => {
    if (err) return;
    
    const hasExecutorId = rows.some(row => row.name === 'executorId');
    if (!hasExecutorId) {
      db.run("ALTER TABLE ProcessedCases ADD COLUMN executorId INTEGER", (err) => {
        if (err) console.error('Ошибка при добавлении executorId:', err.message);
        else console.log('Колонка executorId добавлена в ProcessedCases');
      });
    }
  });

  // Проверяем наличие колонки reviewerId в Reviews
  db.all("PRAGMA table_info(Reviews)", (err, rows) => {
    if (err) return;
    
    const hasReviewerId = rows.some(row => row.name === 'reviewerId');
    if (!hasReviewerId) {
      db.run("ALTER TABLE Reviews ADD COLUMN reviewerId INTEGER", (err) => {
        if (err) console.error('Ошибка при добавлении reviewerId:', err.message);
        else console.log('Колонка reviewerId добавлена в Reviews');
      });
    }
  });

  // Проверяем наличие колонки created_at во всех таблицах
  const tables = ['Users', 'Cases', 'ProcessedCases', 'Projects', 'Reviews'];
  tables.forEach(table => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) return;
      
      const hasCreatedAt = rows.some(row => row.name === 'created_at');
      if (!hasCreatedAt) {
        db.run(`ALTER TABLE ${table} ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
          if (err) console.error(`Ошибка при добавлении created_at в ${table}:`, err.message);
          else console.log(`Колонка created_at добавлена в ${table}`);
        });
      }
    });
  });
}

// Обработка ошибок БД
db.on('error', (err) => {
  console.error('Database error:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Ошибка при закрытии БД:', err.message);
    } else {
      console.log('База данных закрыта');
    }
    process.exit(0);
  });
});

module.exports = db;