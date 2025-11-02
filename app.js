// Глобальное состояние
let currentUser = null;

// Проверка авторизации
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('dashboardBtn').style.display = 'block';
    }
}

// Загрузка рекомендаций
async function loadRecommendations() {
    try {
        const response = await fetch('/api/recommendations');
        const videos = await response.json();
        displayVideos(videos, 'videosGrid');
    } catch (error) {
        console.error('Error loading recommendations:', error);
    }
}

// Поиск видео
async function searchVideos() {
    const query = document.getElementById('searchInput').value;
    if (!query.trim()) return;

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const videos = await response.json();
        displayVideos(videos, 'videosGrid');
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Отображение видео
function displayVideos(videos, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = videos.map(video => `
        <div class="video-card" onclick="watchVideo(${video.id})">
            <div class="video-thumbnail">
                ${video.thumbnail ? 
                    `<img src="${video.thumbnail}" alt="${video.title}">` : 
                    '🎬'
                }
            </div>
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-channel">${video.channel_name}</div>
                <div class="video-stats">
                    <span>👁️ ${video.views}</span>
                    <span>❤️ ${video.likes}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Просмотр видео
function watchVideo(videoId) {
    window.location.href = `watch.html?id=${videoId}`;
}

// Регистрация
async function register(username, email, password) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Регистрация успешна!');
            window.location.href = 'auth.html';
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка регистрации');
    }
}

// Вход
async function login(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        if (result.success) {
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            window.location.href = 'dashboard.html';
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Ошибка входа');
    }
}

// Создание канала
async function createChannel(userId, name, description) {
    try {
        const response = await fetch('/api/channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, name, description })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Channel creation error:', error);
    }
}

// Загрузка видео
async function uploadVideo(channelId, title, description, videoUrl, thumbnail) {
    try {
        const response = await fetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId, title, description, videoUrl, thumbnail })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Upload error:', error);
    }
}

// Мессенджер
async function loadMessages(userId) {
    try {
        const response = await fetch(`/api/messages/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Messages load error:', error);
    }
}

async function sendMessage(fromUser, toUser, text) {
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromUser, toUser, text })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Send message error:', error);
    }
}

// Подписки
async function subscribe(userId, channelId) {
    try {
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, channelId })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Subscribe error:', error);
    }
}

// Лайки
async function likeVideo(userId, videoId) {
    try {
        const response = await fetch('/api/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, videoId })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Like error:', error);
    }
          }
