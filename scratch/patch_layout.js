const fs = require('fs');
const file = 'app/admin/layout.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/export const dynamic = 'force-dynamic';\r?\n?/, '');
fs.writeFileSync(file, content);
