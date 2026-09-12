const fs = require('fs');
const file = 'app/admin/students/page.client.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix 1: Grid view — avatar div -> Link
code = code.replace(
  `                      <div\r\n                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shrink-0 cursor-pointer"\r\n                        style={{ backgroundColor: bg }}\r\n                        onClick={() => toggleSelect(student.id)}\r\n                      >\r\n                        {initials(student.user.fullName)}\r\n                      </div>\r\n                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleSelect(student.id)}>\r\n                        <p className="font-semibold text-[#1a1c1c] truncate">{student.user.fullName}</p>\r\n                        <p className="text-xs text-[#6b7280] truncate">{student.class?.name || 'No class'}</p>\r\n                      </div>`,
  `                      <Link\r\n                        href={\`/admin/students/\${student.id}\`}\r\n                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shrink-0"\r\n                        style={{ backgroundColor: bg }}\r\n                        onClick={(e) => e.stopPropagation()}\r\n                      >\r\n                        {initials(student.user.fullName)}\r\n                      </Link>\r\n                      <Link href={\`/admin/students/\${student.id}\`} className="min-w-0 flex-1 group" onClick={(e) => e.stopPropagation()}>\r\n                        <p className="font-semibold text-[#1a1c1c] truncate group-hover:text-[#1B4D4B] group-hover:underline">{student.user.fullName}</p>\r\n                        <p className="text-xs text-[#6b7280] truncate">{student.class?.name || 'No class'}</p>\r\n                      </Link>`
);

const changed = !code.includes(`onClick={() => toggleSelect(student.id)}\r\n                      >\r\n                        {initials(student.user.fullName)}`);
console.log('Fix applied:', changed);
fs.writeFileSync(file, code);
