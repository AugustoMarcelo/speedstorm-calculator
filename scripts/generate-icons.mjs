import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const input = new URL('../public/icons/icon.svg', import.meta.url);
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon' : `icon-${size}`;
  await sharp(input.pathname).resize(size, size).png().toFile(new URL(`../public/icons/${name}.png`, import.meta.url).pathname);
}
await writeFile(new URL('../public/favicon.svg', import.meta.url), await readFile(input.pathname));
const faviconImages = await Promise.all([16, 32].map(async size => ({
  size,
  data: await sharp(input.pathname).resize(size, size).png().toBuffer(),
})));
for (const { size, data } of faviconImages) {
  await writeFile(new URL(`../public/favicon-${size}x${size}.png`, import.meta.url), data);
}
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(faviconImages.length, 4);
let offset = icoHeader.length + faviconImages.length * 16;
const icoEntries = faviconImages.map(({ size, data }) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});
await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([icoHeader, ...icoEntries, ...faviconImages.map(({ data }) => data)]));
await sharp(input.pathname).resize(384, 384)
  .extend({ top: 64, bottom: 64, left: 64, right: 64, background: '#091724' })
  .png().toFile(new URL('../public/icons/maskable-512.png', import.meta.url).pathname);
