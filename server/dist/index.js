"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
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
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api', export_1.default);
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] OmniWriter API running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});
exports.default = app;
//# sourceMappingURL=index.js.map