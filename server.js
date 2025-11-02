const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('.'));

// === АУТЕНТИФИКАЦИЯ ===
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
    await db.run(
        'INSERT INTO channels (user_id, name, description) VALUES (?, ?, ?)',
        [userId, name, description]
    );
    res.json({ success: true });
});

app.delete('/api/channels/:id', async (req, res) => {
    await db.run('DELETE FROM channels WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// === ВИДЕО ===
app.get('/api/videos', async (req, res) => {
    const videos = await db.all(`
        SELECT v.*, c.name as channel_name, c.avatar as channel_avatar 
        FROM videos v 
        JOIN channels c ON v.channel_id = c.id 
        ORDER BY v.created_at DESC
    `);
    res.json(videos);
});

app.post('/api/videos', async (req, res) => {
    const { channelId, title, description, videoUrl, thumbnail } = req.body;
    await db.run(
        'INSERT INTO videos (channel_id, title, description, video_url, thumbnail) VALUES (?, ?, ?, ?, ?)',
        [channelId, title, description, videoUrl, thumbnail]
    );
    res.json({ success: true });
});

app.delete('/api/videos/:id', async (req, res) => {
    await db.run('DELETE FROM videos WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// === ПОИСК ===
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const videos = await db.all(`
        SELECT v.*, c.name as channel_name 
        FROM videos v 
        JOIN channels c ON v.channel_id = c.id 
        WHERE v.title LIKE ? OR v.description LIKE ? OR c.name LIKE ?
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);
    res.json(videos);
});

// === РЕКОМЕНДАЦИИ ===
app.get('/api/recommendations', async (req, res) => {
    const videos = await db.all(`
        SELECT v.*, c.name as channel_name, c.avatar as channel_avatar 
        FROM videos v 
        JOIN channels c ON v.channel_id = c.id 
        ORDER BY v.views DESC, v.likes DESC 
        LIMIT 20
    `);
    res.json(videos);
});

// === МЕССЕНДЖЕР ===
app.get('/api/messages/:userId', async (req, res) => {
    const messages = await db.all(`
        SELECT m.*, u1.username as from_username, u2.username as to_username
        FROM messages m
        JOIN users u1 ON m.from_user = u1.id
        JOIN users u2 ON m.to_user = u2.id
        WHERE m.from_user = ? OR m.to_user = ?
        ORDER BY m.created_at DESC
    `, [req.params.userId, req.params.userId]);
    res.json(messages);
});

app.post('/api/messages', async (req, res) => {
    const { fromUser, toUser, text } = req.body;
    await db.run(
        'INSERT INTO messages (from_user, to_user, text) VALUES (?, ?, ?)',
        [fromUser, toUser, text]
    );
    res.json({ success: true });
});

// === ПОДПИСКИ ===
app.post('/api/subscribe', async (req, res) => {
    const { userId, channelId } = req.body;
    await db.run(
        'INSERT INTO subscriptions (user_id, channel_id) VALUES (?, ?)',
        [userId, channelId]
    );
    await db.run('UPDATE channels SET subscribers = subscribers + 1 WHERE id = ?', [channelId]);
    res.json({ success: true });
});

app.post('/api/unsubscribe', async (req, res) => {
    const { userId, channelId } = req.body;
    await db.run('DELETE FROM subscriptions WHERE user_id = ? AND channel_id = ?', [userId, channelId]);
    await db.run('UPDATE channels SET subscribers = subscribers - 1 WHERE id = ?', [channelId]);
    res.json({ success: true });
});

// === ЛАЙКИ ===
app.post('/api/like', async (req, res) => {
    const { userId, videoId } = req.body;
    await db.run('INSERT INTO likes (user_id, video_id) VALUES (?, ?)', [userId, videoId]);
    await db.run('UPDATE videos SET likes = likes + 1 WHERE id = ?', [videoId]);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
