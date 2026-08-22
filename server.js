const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

// ========== CONFIG ==========
const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6'];
const adminEmails = new Set(['admin@sonora.com']);
const settings = { maxQueue: 20, cooldown: 30, maxDuration: 600, maxListeners: 20 };
const DISLIKE_THRESHOLD = 10;
const MAX_SONGS_PER_USER = 3;
const SKIP_VOTE_THRESHOLD = 0.5;
const MIN_SKIP_VOTES = 3;
// 🔑 Chave da API agora vem de variável de ambiente
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyB--8a_0tAr9Mf2mxy0oWq7rB0qyacci3I';

// ... restante do código permanece igual
