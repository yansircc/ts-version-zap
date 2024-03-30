// .src/server.ts
import express from 'express';
import { logger } from './utils/logger';

const app = express();
const port = 3000;

app.use(express.static('public')); // 服务静态文件

export const server = app.listen(port, () => {
    logger.info(`服务器已在 http://localhost:${port} 启动。`);
});