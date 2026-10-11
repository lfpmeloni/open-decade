import fs from 'node:fs/promises';
import {capabilities} from '../src/capabilities.mjs';
const cell=x=>String(x??'—').replaceAll('|',' / ').replaceAll('\n',' ');
export const listing=()=>`# Installed capability listing\n\nGenerated from [the registry](../src/capabilities.mjs). Run \`npm run docs\` after\nchanging statuses; planned entries are unavailable, experimental entries have limited\nacceptance. See [the roadmap](roadmap.md) for full round gates.\n\n| Capability | Status | Command | Scope and limits |\n|---|---|---|---|\n${capabilities.map(c=>`| [${cell(c.id)}](../${c.workflow}) | ${c.status} | ${cell(c.command)} | ${cell(c.limits)} |`).join('\n')}\n`;
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)await fs.writeFile(new URL('../docs/capabilities.md',import.meta.url),listing());
