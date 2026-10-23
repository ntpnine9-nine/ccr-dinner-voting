import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {menuMediaFor} from '../menu-media.js';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const entries = fs.readdirSync(root).filter(name => /\.(html|js|css)$/.test(name));
let references = 0;
for (const name of entries) {
  const source = fs.readFileSync(path.join(root, name), 'utf8');
  assert.doesNotMatch(source, /^(<<<<<<< |=======|>>>>>>> )/m, name + ': unresolved merge conflict');
  if (name.endsWith('.js')) execFileSync(process.execPath, ['--check', path.join(root, name)]);
  const matches = [...source.matchAll(/(?:src|href)=["']([^"']+)["']|\bfrom\s+["']([^"']+)["']|url\(["']?([^\s)'";]+)["']?\)/g)];
  for (const match of matches) {
    const ref = (match[1] || match[2] || match[3]).split(/[?#]/)[0];
    if (!ref || /^(?:https?:|data:|mailto:|tel:)/.test(ref) || ref.includes('${')) continue;
    assert.ok(fs.existsSync(path.resolve(root, ref)), `${name}: missing local dependency ${ref}`);
    references++;
  }
}
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'menus.json')));
let mapped = 0;
for (const category of catalog.categories) for (const option of category.options) {
  const media = menuMediaFor(option.id);
  if (media) {
    mapped++;
    assert.ok(fs.existsSync(path.resolve(root, media.src)), `Missing food image: ${option.id}`);
    assert.ok(['ai-illustration','restaurant-menu'].includes(media.kind));
  }
}
assert.equal(mapped,55,'All identifiable dishes must have media');
console.log(`PASS · ${references} local dependency references · ${mapped}/56 verified local food images · syntax and merge integrity`);
