const fs = require('fs');
let code = fs.readFileSync('app/admin/page.tsx', 'utf8');
if (!code.includes("import React")) {
  code = "import React from 'react';\n" + code;
}
fs.writeFileSync('app/admin/page.tsx', code);
