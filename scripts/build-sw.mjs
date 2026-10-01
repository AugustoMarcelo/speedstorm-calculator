import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = process.argv[2] ? pathToFileURL(`${process.argv[2]}/`) : new URL('../dist/', import.meta.url);
async function filesIn(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesIn(new URL(`${entry.name}/`, directory), `${prefix}${entry.name}/`)
    : [`${prefix}${entry.name}`]));
  return groups.flat();
}
const files = (await filesIn(dist)).filter(file => file !== 'sw.js').sort();
const hash = createHash('sha256');
const template = await readFile(new URL('./sw-template.js', import.meta.url), 'utf8');
hash.update(template);
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(new URL(file, dist)));
}
const version = hash.digest('hex').slice(0, 16);
await writeFile(new URL('sw.js', dist), template
  .replace('__BUILD_VERSION__', version)
  .replace('__PRECACHE_FILES__', JSON.stringify(files)));
console.log(`Service worker: build ${version}, ${files.length} arquivos em precache (${join('dist', 'sw.js')}).`);
