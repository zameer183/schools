const fs = require('fs');
const file = 'src/components/layout/dashboard-shell.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const UNREAD_POLL_INTERVAL_MS = \d+;/, 'const UNREAD_POLL_INTERVAL_MS = 60000;');
fs.writeFileSync(file, content);
