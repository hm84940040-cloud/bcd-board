import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import archiver from 'archiver';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // 실시간 데이터 저장소
  let bcdStats = {
    배정: 0,
    완료: 0,
    거절: 0,
    거절률: 0,
    수락전취소: 0,
    수락후취소: 0,
    근무인원: 0,
    피크타임: {
      아침: { 목표: 0, 완료: 0, 상태: '' },
      점심피크: { 목표: 0, 완료: 0, 상태: '' },
      점심논피크: { 목표: 0, 완료: 0, 상태: '' },
      저녁피크: { 목표: 0, 완료: 0, 상태: '' },
      저녁논피크: { 목표: 0, 완료: 0, 상태: '' }
    },
    업데이트시간: "-"
  };

  // 1. 데이터 수신 API (확장 프로그램용)
  app.post('/api/update_data.php', (req, res) => {
    const { sync_key, 배정, 완료, 거절, 거절률, 수락전취소, 수락후취소, 근무인원, 피크타임 } = req.body;
    if (sync_key !== '3735d8ead16b3bb107e4c967ebe676') return res.status(403).send('Forbidden');

    bcdStats = {
      배정: 배정 !== undefined ? 배정 : bcdStats.배정,
      완료: 완료 !== undefined ? 완료 : bcdStats.완료,
      거절: 거절 !== undefined ? 거절 : bcdStats.거절,
      거절률: 거절률 !== undefined ? 거절률 : bcdStats.거절률,
      수락전취소: 수락전취소 !== undefined ? 수락전취소 : bcdStats.수락전취소,
      수락후취소: 수락후취소 !== undefined ? 수락후취소 : bcdStats.수락후취소,
      근무인원: 근무인원 !== undefined ? 근무인원 : bcdStats.근무인원,
      피크타임: 피크타임 ? { ...bcdStats.피크타임, ...피크타임 } : bcdStats.피크타임,
      업데이트시간: new Date().toLocaleTimeString('ko-KR')
    };

    console.log('📥 수신 데이터 반영:', bcdStats);
    res.json({ ok: true });
  });

  // 2. 데이터 송신 API (리액트 대시보드용) - 형식을 단순화함
  app.get('/api/current_data', (req, res) => {
    res.json(bcdStats); 
  });

  // 3. 확장 프로그램 다운로드 API
  app.get('/api/download_extension', (req, res) => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=bcd-extension.zip');

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    const extDir = path.join(process.cwd(), 'extension');
    
    // 호스트 환경의 URL을 파악하여 background.js 에 주입
    // X-Forwarded-Proto, X-Forwarded-Host 를 확인 (클라우드런 뒤일 경우)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const fullServerUrl = `${protocol}://${host}/api/update_data.php`;

    fs.readdirSync(extDir).forEach(file => {
      if (file === 'background.js') {
        let content = fs.readFileSync(path.join(extDir, file), 'utf8');
        content = content.replace('http://localhost:3000/api/update_data.php', fullServerUrl);
        archive.append(content, { name: file });
      } else {
        archive.file(path.join(extDir, file), { name: file });
      }
    });

    archive.finalize();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`BCD+ Server Running on Port ${PORT}`));
}

startServer();