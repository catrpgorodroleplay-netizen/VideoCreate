const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = 3000;

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'video') {
      cb(null, 'uploads/videos/');
    } else {
      cb(null, 'uploads/avatars/');
    }
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB лимит
  }
});

app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// === РЕГИСТРАЦИЯ И АВТОРИЗАЦИЯ ===
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'User already exists' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, user: { id: user.id, username: user.username } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// === КАНАЛЫ ===
app.post('/api/channels', async (req, res) => {
    const { userId, name, description } = req.body;
    const result = await db.run(
        'INSERT INTO channels (user_id, name, description) VALUES (?, ?, ?)',
        [userId, name, description]
    );
    res.json({ success: true, channelId: result.id });
});

// === РЕАЛЬНАЯ ЗАГРУЗКА ВИДЕО ===
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
    try {
        const { channelId, title, description } = req.body;
        const user = JSON.parse(req.body.user); // пользователь из формы
        
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const videoUrl = `/uploads/videos/${req.file.filename}`;
        
        // Создаем запись в базе данных
        await db.run(
            'INSERT INTO videos (channel_id, title, description, video_url, thumbnail) VALUES (?, ?, ?, ?, ?)',
            [channelId, title, description, videoUrl, '/assets/default-thumbnail.jpg']
        );

        res.json({ 
            success: true, 
            message: 'Video uploaded successfully',
            videoUrl: videoUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// === ПОЛУЧЕНИЕ ВИДЕО ===
app.get('/api/videos', async (req, res) => {
    const videos = await db.all(`
        SELECT v.*, c.name as channel_name, c.avatar as channel_avatar 
        FROM videos v 
        JOIN channels c ON v.channel_id = c.id 
        WHERE v.video_url IS NOT NULL
        ORDER BY v.created_at DESC
    `);
    res.json(videos);
});

app.get('/api/videos/:id', async (req, res) => {
    const video = await db.get(`
        SELECT v.*, c.name as channel_name, c.subscribers, c.user_id as channel_user_id
        FROM videos v 
        JOIN channels c ON v.channel_id = c.id 
        WHERE v.id = ?
    `, [req.params.id]);
    
    if (video) {
        // Увеличиваем счетчик просмотров
        await db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
    }
    
    res.json(video);
});

// === ОСТАЛЬНЫЕ API РОУТЫ (из предыдущей версии) ===
app.get('/api/channels/:id', async (req, res) => {
    const channel = await db.get('SELECT * FROM channels WHERE id = ?', [req.params.id]);
    res.json(channel);
});

app.get('/api/channels/:id/videos', async (req, res) => {
    const videos = await db.all('SELECT * FROM videos WHERE channel_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(videos);
});

app.get('/api/user/channel/:userId', async (req, res) => {
    const channel = await db.get('SELECT * FROM channels WHERE user_id = ?', [req.params.userId]);
    res.json(channel);
});

app.get('/api/user/videos/:userId', async (req, res) => {
    const videos = await db.all(`
        SELECT v.* FROM videos v 
        JOIN channels c ON v.channel_id = c.id 
        WHERE c.user_id = ?
    `, [req.params.userId]);
    res.json(videos);
});

app.get('/api/users', async (req, res) => {
    const users = await db.all('SELECT id, username FROM users');
    res.json(users);
});

app.delete('/api/videos/:id', async (req, res) => {
    // Сначала получаем информацию о видео чтобы удалить файл
    const video = await db.get('SELECT * FROM videos WHERE id = ?', [req.params.id]);
    
    if (video && video.video_url) {
        const fs = require('fs');
        const filePath = '.' + video.video_url;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    
    await db.run('DELETE FROM videos WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

app.delete('/api/channels/:id', async (req, res) => {
    // Удаляем все видео канала
    const videos = await db.all('SELECT * FROM videos WHERE channel_id = ?', [req.params.id]);
    const fs = require('fs');
    
    for (const video of videos) {
        if (video.video_url) {
            const filePath = '.' + video.video_url;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
    
    await db.run('DELETE FROM channels WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// Поиск, рекомендации, сообщения и т.д. (остаются как были)
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const videos = await db.all(`
        SELECT v.*, c.name as channel_name 
        FROM videos v 
        JOIN channels c ON v.channel_id = c.id 
        WHERE (v.title LIKE ? OR v.description LIKE ? OR c.name LIKE ?) AND v.video_url IS NOT NULL
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);
    res.json(videos);
});

app.get('/api/recommendations', async (req, res) => {
    const videos = await db.all(`
        SELECT v.*, c.name as channel_name, c.avatar as channel_avatar 
        FROM videos v 
        JOIN channels c ON v.channel_id = c.id 
        WHERE v.video_url IS NOT NULL
        ORDER BY v.views DESC, v.likes DESC 
        LIMIT 20
    `);
    res.json(videos);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 CREATE Platform running at http://localhost:${PORT}`);
    console.log(`📁 Uploads folder: ./uploads/`);
    console.log(`🎬 Videos folder: ./uploads/videos/`);
});
