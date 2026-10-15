import {cp, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const target=new URL('public/vendor/',root);
await mkdir(target,{recursive:true});
for(const [from,to] of [
 ['pdfjs-dist/build/pdf.mjs','pdf.mjs'],
 ['pdfjs-dist/build/pdf.worker.mjs','pdf.worker.mjs'],
 ['pdfjs-dist/cmaps','cmaps'],
 ['pdfjs-dist/standard_fonts','standard_fonts'],
 ['pdfjs-dist/wasm','wasm'],
 ['pdfjs-dist/LICENSE','PDFJS-LICENSE.txt'],
 ['mammoth/mammoth.browser.min.js','mammoth.browser.min.js'],
 ['mammoth/LICENSE','MAMMOTH-LICENSE.txt'],
])await cp(new URL('node_modules/'+from,root),new URL(to,target),{recursive:true});
console.log('Prepared browser-local document parsers at '+fileURLToPath(target));
