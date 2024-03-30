// .src/server.ts
import express from 'express';
import path from 'path';


const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'services/public')));

export const server = app.listen(port, () => {
    //logger.info(`服务器已在 http://localhost:${port} 启动。`);
});
