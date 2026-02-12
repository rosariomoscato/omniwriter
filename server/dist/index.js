"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("passport"));
const express_session_1 = __importDefault(require("express-session"));
const database_1 = require("./db/database");
const health_1 = __importDefault(require("./routes/health"));
const auth_1 = __importDefault(require("./routes/auth"));
const projects_1 = __importDefault(require("./routes/projects"));
const human_models_1 = __importDefault(require("./routes/human-models"));
const chapters_1 = __importDefault(require("./routes/chapters"));
const sources_1 = __importDefault(require("./routes/sources"));
const characters_1 = __importDefault(require("./routes/characters"));
const export_1 = __importDefault(require("./routes/export"));
const sagas_1 = __importDefault(require("./routes/sagas"));
const admin_1 = __importDefault(require("./routes/admin"));
const users_1 = __importDefault(require("./routes/users"));
const citations_1 = __importDefault(require("./routes/citations"));
const locations_1 = __importDefault(require("./routes/locations"));
const plot_events_1 = __importDefault(require("./routes/plot-events"));
const generation_logs_1 = __importDefault(require("./routes/generation-logs"));
const ai_1 = __importDefault(require("./routes/ai"));
const path_1 = require("path");
const envPath = (0, path_1.resolve)(__dirname, '..', '.env');
dotenv_1.default.config({ path: envPath });
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Passport and session middleware for OAuth
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'omniwriter-session-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Request logging middleware - logs all API requests
app.use('/api', (req, _res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
});
// Initialize database
const db = (0, database_1.initializeDatabase)();
console.log('[Database] SQLite database connected successfully');
// Middleware to attach database to request
app.use('/api/admin', (req, res, next) => {
    req.db = db;
    next();
});
// Routes
app.use('/api/health', health_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/projects', projects_1.default);
app.use('/api/human-models', human_models_1.default);
app.use('/api/sagas', sagas_1.default);
app.use('/api', chapters_1.default);
app.use('/api', sources_1.default);
app.use('/api', characters_1.default);
app.use('/api', locations_1.default);
app.use('/api', plot_events_1.default);
app.use('/api', citations_1.default);
app.use('/api', export_1.default);
app.use('/api', generation_logs_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/admin', admin_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error('[Error]', err.message);
    res.status(500).json({ message: 'Internal server error' });
});
app.listen(PORT, '127.0.0.1', () => {
    console.log(`[Server] OmniWriter API running on 127.0.0.1:${PORT}`);
    console.log(`[Server] Health check: http://127.0.0.1:${PORT}/api/health`);
});
exports.default = app;
//# sourceMappingURL=index.js.map