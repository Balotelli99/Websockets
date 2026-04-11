let ws = null;
let currentUsername = null;
let onlineUsers = [];

const btnToLogin = document.getElementById('btnToLogin');
const btnToRegister = document.getElementById('btnToRegister');
const btnBack = document.getElementById('btnBack');
const btnBackToLanding = document.getElementById('btnBackToLanding');
const linkToRegister = document.getElementById('linkToRegister');
const linkToLogin = document.getElementById('linkToLogin');

const landingView = document.getElementById('landing-view');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const chatAppView = document.getElementById('chat-app-view');

btnToLogin.addEventListener('click', () => {
    landingView.classList.replace('view-active', 'view-hidden');
    loginView.classList.replace('view-hidden', 'view-active');
});

btnToRegister.addEventListener('click', () => {
    landingView.classList.replace('view-active', 'view-hidden');
    registerView.classList.replace('view-hidden', 'view-active');
});

btnBack.addEventListener('click', () => {
    loginView.classList.replace('view-active', 'view-hidden');
    landingView.classList.replace('view-hidden', 'view-active');
});

btnBackToLanding.addEventListener('click', () => {
    registerView.classList.replace('view-active', 'view-hidden');
    landingView.classList.replace('view-hidden', 'view-active');
});

linkToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.classList.replace('view-active', 'view-hidden');
    registerView.classList.replace('view-hidden', 'view-active');
});

linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerView.classList.replace('view-active', 'view-hidden');
    loginView.classList.replace('view-hidden', 'view-active');
});

const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('passwordInput');
const eyeIcon = document.getElementById('eyeIcon');

togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    if (type === 'text') {
        eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
});

const regTogglePassword = document.getElementById('regTogglePassword');
const regPasswordInput = document.getElementById('regPasswordInput');
const regEyeIcon = document.getElementById('regEyeIcon');

regTogglePassword.addEventListener('click', function () {
    const type = regPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    regPasswordInput.setAttribute('type', type);
    if (type === 'text') {
        regEyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        regEyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
});

function connectWebSocket(username) {
    ws = new WebSocket(`ws://${window.location.host}`);
    currentUsername = username;
    
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'login', username: username }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'userList') {
            onlineUsers = data.users.filter(u => u.username !== currentUsername);
            renderUserList();
        } else if (data.type === 'privateMessage') {
            showMessage(data.from, data.content);
        }
    };

    ws.onclose = () => {
        ws = null;
    };
}

let unreadCounts = {};

function renderUserList() {
    const chatList = document.querySelector('.chat-list');
    if (onlineUsers.length === 0) {
        chatList.innerHTML = '<div class="no-users">Nog geen andere gebruikers online. Wacht tot anderen inloggen!</div>';
        return;
    }
    chatList.innerHTML = onlineUsers.map(user => {
        const unread = unreadCounts[user.username] || 0;
        const badgeClass = unread > 0 ? '' : 'hidden';
        return `
        <div class="chat-item" data-user="${user.username}">
            <div class="chat-info">
                <div class="chat-header-info">
                    <span class="chat-name">${user.username}</span>
                </div>
                <div class="chat-message-info">
                    <span class="chat-snippet">Klik om te chatten</span>
                    <span class="unread-badge ${badgeClass}">${unread}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            openChat(item.dataset.user);
        });
    });
}

let currentChatPartner = null;
let chatMessages = {};

function openChat(username) {
    currentChatPartner = username;
    document.getElementById('chatPartnerName').textContent = username;
    
    if (unreadCounts[username]) {
        unreadCounts[username] = 0;
        renderUserList();
    }
    
    document.getElementById('chat-app-view').classList.replace('view-active', 'view-hidden');
    document.getElementById('chat-view').classList.replace('view-hidden', 'view-active');
    
    renderChatMessages();
}

function renderChatMessages() {
    const messagesContainer = document.getElementById('chatMessages');
    const key = [currentUsername, currentChatPartner].sort().join('|');
    const messages = chatMessages[key] || [];
    
    messagesContainer.innerHTML = messages.map(msg => `
        <div class="message ${msg.from === currentUsername ? 'sent' : 'received'}">
            <div class="message-content">${msg.content}</div>
        </div>
    `).join('');
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

document.getElementById('btnBackToList').addEventListener('click', () => {
    document.getElementById('chat-view').classList.replace('view-active', 'view-hidden');
    document.getElementById('chat-app-view').classList.replace('view-hidden', 'view-active');
    currentChatPartner = null;
});

document.getElementById('btnSendMessage').addEventListener('click', sendMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content || !ws) return;
    
    const key = [currentUsername, currentChatPartner].sort().join('|');
    if (!chatMessages[key]) chatMessages[key] = [];
    chatMessages[key].push({ from: currentUsername, content: content, time: new Date() });
    
    ws.send(JSON.stringify({ type: 'privateMessage', to: currentChatPartner, content: content }));
    input.value = '';
    renderChatMessages();
}

function showMessage(from, content) {
    const key = [currentUsername, from].sort().join('|');
    if (!chatMessages[key]) chatMessages[key] = [];
    chatMessages[key].push({ from: from, content: content, time: new Date() });
    
    if (currentChatPartner === from) {
        renderChatMessages();
    } else {
        unreadCounts[from] = (unreadCounts[from] || 0) + 1;
        renderUserList();
    }
}

document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        let username;
        if (loginView.classList.contains('view-active')) {
            username = loginView.querySelector('input[type="email"]').value.split('@')[0];
        } else {
            username = registerView.querySelector('input[type="text"]').value;
        }
        
        if (!username) {
            alert('Vul een naam in');
            return;
        }
        
        if(loginView.classList.contains('view-active')) loginView.classList.replace('view-active', 'view-hidden');
        if(registerView.classList.contains('view-active')) registerView.classList.replace('view-active', 'view-hidden');
        
        document.body.style.background = '#0f172a';
        chatAppView.classList.replace('view-hidden', 'view-active');
        
        connectWebSocket(username);
    });
});

const btnSettings = document.getElementById('btnSettings');
const settingsMenu = document.getElementById('settingsMenu');
const btnLogout = document.getElementById('btnLogout');
const btnOpenSettings = document.getElementById('btnOpenSettings');

btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    if (settingsMenu.classList.contains('view-hidden')) {
        settingsMenu.classList.replace('view-hidden', 'view-active');
    } else {
        settingsMenu.classList.replace('view-active', 'view-hidden');
    }
});

document.addEventListener('click', (e) => {
    if (!settingsMenu.contains(e.target) && settingsMenu.classList.contains('view-active')) {
        settingsMenu.classList.replace('view-active', 'view-hidden');
    }
});

const settingsView = document.getElementById('settings-view');
const btnBackFromSettings = document.getElementById('btnBackFromSettings');

btnOpenSettings.addEventListener('click', () => {
    settingsMenu.classList.replace('view-active', 'view-hidden');
    chatAppView.classList.replace('view-active', 'view-hidden');
    settingsView.classList.replace('view-hidden', 'view-active');
});

btnBackFromSettings.addEventListener('click', () => {
    settingsView.classList.replace('view-active', 'view-hidden');
    chatAppView.classList.replace('view-hidden', 'view-active');
});

// Settings Logic: Thema
const themeCards = document.querySelectorAll('.theme-card');
themeCards.forEach(card => {
    card.addEventListener('click', () => {
        themeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const theme = card.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', theme);
    });
});

// Settings Logic: Lettergrootte
const fontSizeItems = document.querySelectorAll('.font-size-item');
fontSizeItems.forEach(item => {
    item.addEventListener('click', () => {
        fontSizeItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const size = item.getAttribute('data-size');
        if (size === 'klein') {
            document.documentElement.style.setProperty('--base-font-size', '14px');
        } else {
            document.documentElement.style.setProperty('--base-font-size', '16px');
        }
    });
});

btnLogout.addEventListener('click', () => {
    settingsMenu.classList.replace('view-active', 'view-hidden');
    chatAppView.classList.replace('view-active', 'view-hidden');
    document.body.style.background = '';
    landingView.classList.replace('view-hidden', 'view-active');
    document.querySelectorAll('input').forEach(input => input.value = '');
    if (ws) {
        ws.close();
        ws = null;
    }
});

// Search functionality
const searchInput = document.getElementById('searchInput');
if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            const name = item.querySelector('.chat-name').textContent.toLowerCase();
            if (name.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}