const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(':memory:', (err) => {
            if (err) console.error('Database error:', err);
            else this.initialize();
        });
    }

    initialize() {
        // Пользователи
        this.db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            avatar TEXT DEFAULT 'default.jpg',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Каналы
        this.db.run(`CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            avatar TEXT,
            subscribers INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Видео
        this.db.run(`CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            video_url TEXT NOT NULL,
            thumbnail TEXT,
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            duration INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(channel_id) REFERENCES channels(id) ON DELETE CASCADE
        )`);

        // Подписки
        this.db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
            user_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(user_id, channel_id)
        )`);

        // Сообщения
        this.db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user INTEGER NOT NULL,
            to_user INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Лайки
        this.db.run(`CREATE TABLE IF NOT EXISTS likes (
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            PRIMARY KEY(user_id, video_id)
        )`);

        // История просмотров (для рекомендаций)
        this.db.run(`CREATE TABLE IF NOT EXISTS history (
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            watched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('Database initialized');
    }

    // Все методы базы данных...
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }
}

module.exports = new Database();
