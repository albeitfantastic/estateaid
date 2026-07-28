import fs from 'fs';
const s = fs.readFileSync('logo_green.svg', 'utf8');
const one = s.replace(/\s+/g, ' ').trim();
fs.writeFileSync(
  'components/ui/logo-green-svg-xml.ts',
  `/** Auto-generated from repo root \`logo_green.svg\` — do not edit by hand; re-run: \`node scripts/minify-logo-svg.mjs\` */
export const LOGO_GREEN_SVG_XML = ${JSON.stringify(one)};
`,
  'utf8'
);
