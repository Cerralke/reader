import {readdir,readFile} from 'node:fs/promises';

export const fonts = [
  {id:'literata',family:'"Literata", Georgia, serif'},
  {id:'bitter',family:'"Bitter", Georgia, serif'},
  {id:'inter',family:'"Inter", system-ui, sans-serif'},
  {id:'atkinson',family:'"Atkinson Hyperlegible Next", system-ui, sans-serif'},
  {id:'pt-mono',family:'"PT Mono", monospace'},
] as const;

// Resolve relative to the installed package, never to the book's working directory.
export async function fontAssets():Promise<Map<string,Uint8Array>> {
  const directory=new URL('../static/fonts/',import.meta.url);
  const assets=new Map<string,Uint8Array>();
  for(const name of await readdir(directory)) {
    assets.set('assets/fonts/'+name,await readFile(new URL(name,directory)));
  }
  return assets;
}
