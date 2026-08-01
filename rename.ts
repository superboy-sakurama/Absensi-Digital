import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('src').filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));

for (const file of files) {
  if (file === 'src/lib/time.ts' || file.includes('server.ts') || file.includes('utils.ts')) {
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;
  
  if (content.match(/new Date\(\)/)) {
    const original = content;
    content = content.replace(/new Date\(\)/g, 'getServerTime()');
      
    if (!content.includes('import { getServerTime }')) {
        content = `import { getServerTime } from '@/lib/time';\n` + content;
    }

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
}
