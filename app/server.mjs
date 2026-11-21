import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { parseCsv, readBaseCurrency, snapshot, drift } from './portfolio.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = path.resolve(process.env.OD_DATA || path.join(root, 'data'));
if (!fs.existsSync(data)) fs.cpSync(path.join(root, 'data.example'), data, { recursive: true });
for (const dir of ['chats', 'market', 'recommendations']) fs.mkdirSync(path.join(data, dir), { recursive: true });
const read = (file, fallback = '') => { try { return fs.readFileSync(path.join(data, file), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } };
const json = (file, fallback = null) => { const text = read(file); return text ? JSON.parse(text) : fallback; };
const write = (file, value) => fs.writeFileSync(path.join(data, file), value);
const saveChat = chat => write(`chats/${chat.id}.json`, JSON.stringify(chat, null, 2));
const validId = id => /^[\w-]+$/.test(id);
let busy = false;
const server = http.createServer(async (req, res) => {
  const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  try {
    const url = new URL(req.url, 'http://localhost');
    const route = decodeURIComponent(url.pathname);
    const method = req.method;
    let body;
    if (method === 'POST' || method === 'PUT') {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 1048576) fail(413, 'request body exceeds 1MB'); chunks.push(chunk); }
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { fail(400, 'invalid JSON'); }
      if (!body || typeof body !== 'object') fail(400, 'invalid body');
    }
    if (method === 'GET' && route === '/') {
      const html = fs.readFileSync(path.join(root, 'app/index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (method === 'GET' && route === '/api/state') {
      const profile = read('profile.md'), quotes = json('market/quotes.json', {}), target = json('target.json');
      const snap = snapshot({ holdings: parseCsv(read('holdings.csv')), quotes, baseCurrency: readBaseCurrency(profile) });
      const recommendations = fs.readdirSync(path.join(data, 'recommendations')).filter(f => /^[\w.-]+\.md$/.test(f)).sort().reverse().map(file => ({
        file, title: read(`recommendations/${file}`).match(/^#\s+(.+)$/m)?.[1] || file, date: file.slice(0, 10)
      }));
      const timestamps = Object.values(quotes).map(q => q.ts).filter(ts => Number.isFinite(Date.parse(ts)));
      const quotesUpdated = timestamps.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
      return send(200, { profile, snapshot: snap, attention: json('attention.json', []), target, drift: drift(snap, target), recommendations, quotesUpdated, busy });
    }
    if (route.startsWith('/api/recommendations/') && method === 'GET') {
      const file = route.slice('/api/recommendations/'.length);
      if (!/^[\w.-]+\.md$/.test(file)) fail(400, 'invalid filename');
      const markdown = read(`recommendations/${file}`, null);
      if (markdown === null) fail(404, 'report not found');
      return send(200, { file, markdown });
    }
    if (route === '/api/profile' && method === 'PUT') {
      if (typeof body.markdown !== 'string') fail(400, 'markdown must be a string');
      write('profile.md', body.markdown); return send(200, { ok: true });
    }
    if (route === '/api/holdings') {
      if (method === 'GET') return send(200, { csv: read('holdings.csv') });
      if (method === 'PUT') {
        if (typeof body.csv !== 'string') fail(400, 'csv must be a string');
        write('holdings.csv', body.csv); return send(200, { ok: true });
      }
    }
    if (route === '/api/chats' && method === 'GET') {
      const chats = fs.readdirSync(path.join(data, 'chats')).filter(f => /^[\w-]+\.json$/.test(f)).map(f => json(`chats/${f}`));
      return send(200, chats.map(c => ({ id: c.id, title: c.title, created: c.created, updated: c.messages.at(-1)?.ts || c.created })).sort((a, b) => b.updated.localeCompare(a.updated)));
    }
    if (route.startsWith('/api/chats/')) {
      const id = route.slice('/api/chats/'.length);
      if (!validId(id)) fail(400, 'invalid chat id');
      const chat = json(`chats/${id}.json`);
      if (!chat) fail(404, 'chat not found');
      if (method === 'GET') return send(200, chat);
      if (method === 'DELETE') { fs.unlinkSync(path.join(data, `chats/${id}.json`)); return send(200, { ok: true }); }
    }
    if (route === '/api/chat' && method === 'POST') {
      if (busy) return send(409, { error: 'agent busy' });
      if (typeof body.text !== 'string' || !body.text.trim()) fail(400, 'text is required');
      if (body.id !== undefined && (typeof body.id !== 'string' || !validId(body.id))) fail(400, 'invalid chat id');
      const chat = body.id ? json(`chats/${body.id}.json`) : { id: randomUUID(), title: body.text.slice(0, 60), claude_session_id: null, created: new Date().toISOString(), messages: [] };
      if (!chat) fail(404, 'chat not found');
      chat.messages.push({ role: 'user', text: body.text, ts: new Date().toISOString() }); saveChat(chat);
      busy = true;
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      const event = (name, value) => { if (!res.destroyed) res.write(`event: ${name}\ndata: ${JSON.stringify(value)}\n\n`); };
      event('chat', { id: chat.id });
      const args = ['-p', '--model', 'sonnet', '--effort', 'low', '--output-format', 'stream-json', '--verbose', '--include-partial-messages'];
      if (chat.claude_session_id) args.push('--resume', chat.claude_session_id);
      let child, accumulated = '', finalText, error, stderr = '';
      const finish = () => {
        try {
          const text = finalText ?? accumulated;
          chat.messages.push({ role: 'assistant', text, ts: new Date().toISOString() }); saveChat(chat);
          if (error) event('error', { message: error }); else event('done', { id: chat.id, text });
        } catch (e) { event('error', { message: e.message }); }
        finally { busy = false; res.end(); }
      };
      try { child = spawn(process.env.CLAUDE_BIN || 'claude', args, { cwd: root, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] }); child.stdin.on('error', () => {}); child.stdin.end(body.text); }
      catch (e) { error = e.message; finish(); return; }
      createInterface({ input: child.stdout }).on('line', line => {
        let msg; try { msg = JSON.parse(line); } catch { return; }
        if (msg.session_id) chat.claude_session_id = msg.session_id;
        if (msg.type === 'stream_event' && msg.event?.type === 'content_block_delta' && msg.event.delta?.type === 'text_delta') {
          accumulated += msg.event.delta.text; event('delta', { text: msg.event.delta.text });
        }
        if (msg.type === 'assistant') for (const block of msg.message?.content || []) if (block.type === 'tool_use') {
          const input = block.input || {};
          event('tool', { name: block.name, detail: String(input.skill || input.command || input.file_path || input.pattern || '').slice(0, 200) });
        }
        if (msg.type === 'result') { finalText = msg.result ?? accumulated; if (msg.is_error) error = msg.result || 'Claude failed'; }
      });
      child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
      child.on('error', e => { error = e.code === 'ENOENT' ? 'Install Claude Code CLI and log in to use chat.' : e.message; });
      child.on('close', code => { if (code !== 0 && !error) error = stderr.trim() || `Claude exited with code ${code}`; finish(); });
      return;
    }
    send(404, { error: 'not found' });
  } catch (e) { if (!res.headersSent) send(e.status || (e instanceof URIError ? 400 : 500), { error: e.message }); else res.end(); }
});
server.listen(Number(process.env.PORT || 4317), '127.0.0.1', () => console.log(`open-decade running at http://127.0.0.1:${server.address().port}`));
