import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/design/app-icon',{recursive:true});
await cp('index.html','dist/index.html');
await cp('style.css','dist/style.css');
await cp('script.js','dist/script.js');
await cp('design/app-icon/icon_1024_transparent.png','dist/design/app-icon/icon_1024_transparent.png');
console.log('Web assets copied to dist/');