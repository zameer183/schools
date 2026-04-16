import { readFile } from 'fs/promises';
import path from 'path';

export async function StaticTemplateFrame({
  folder,
  title
}: {
  folder: string;
  title: string;
}) {
  const filePath = path.join(process.cwd(), folder, 'code.html');
  const html = await readFile(filePath, 'utf8');

  return (
    <iframe
      title={title}
      srcDoc={html}
      className="block h-screen w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
}
