(function(root){
 'use strict';
 let mammothPromise;
 function loadMammoth(){
  if(root.mammoth)return Promise.resolve(root.mammoth);
  return mammothPromise||=(new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/mammoth.browser.min.js';s.onload=()=>resolve(root.mammoth);s.onerror=()=>{mammothPromise=null;reject(Error('DOCX 추출기를 불러오지 못했습니다.'));};document.head.append(s);}));
 }
 function validateZip(buffer){
  const v=new DataView(buffer);let total=0,count=0;
  for(let i=0;i<v.byteLength-46;i++)if(v.getUint32(i,true)===0x02014b50){
    total+=v.getUint32(i+24,true);count++;const name=v.getUint16(i+28,true),extra=v.getUint16(i+30,true),comment=v.getUint16(i+32,true);i+=45+name+extra+comment;
  }
  if(!count||count>2000||total>32*1024*1024)throw Error('DOCX 내부 크기가 너무 크거나 지원하지 않는 문서입니다. 텍스트로 가져와 주세요.');
 }
 async function extract(file){
  if(file.size>8*1024*1024)throw Error('문서는 8MB 이하로 가져와 주세요.');
  const ext=file.name.split('.').at(-1).toLowerCase();let segments=[];
  const buffer=await file.arrayBuffer();
  if(ext==='pdf'){
    const pdfjs=await import('/vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.mjs';
    const task=pdfjs.getDocument({data:new Uint8Array(buffer.slice(0)),isEvalSupported:false,cMapUrl:'/vendor/cmaps/',cMapPacked:true,standardFontDataUrl:'/vendor/standard_fonts/',wasmUrl:'/vendor/wasm/',useSystemFonts:false});
    let pdf;
    try{pdf=await task.promise;if(pdf.numPages>60)throw Error('PDF는 60쪽 이하로 나누어 가져와 주세요.');
     for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();const text=content.items.map(x=>typeof x.str==='string'?x.str+(x.hasEOL?'\n':' '):'').join('').trim();if(text)segments.push({label:`PDF ${n}쪽`,text});page.cleanup();}
    }finally{await task.destroy();}
  }else if(ext==='docx'){
    validateZip(buffer);const mammoth=await loadMammoth();const result=await mammoth.extractRawText({arrayBuffer:buffer},{externalFileAccess:false});
    segments=result.value.split(/\n\s*\n/).filter(t=>t.trim()).map((text,i)=>({label:`DOCX 문단 ${i+1}`,text:text.trim()}));
  }else if(['txt','md'].includes(ext)){
    segments=new TextDecoder('utf-8',{fatal:false}).decode(buffer).split(/\n\s*\n/).filter(t=>t.trim()).map((text,i)=>({label:`문단 ${i+1}`,text:text.trim()}));
  }else throw Error('PDF, DOCX, TXT, Markdown 파일을 선택해 주세요.');
  const text=segments.map(s=>s.text).join('\n\n');
  if(!text.trim())throw Error('추출할 텍스트가 없습니다. 스캔 PDF는 OCR을 지원하지 않으므로 텍스트를 직접 붙여넣어 주세요.');
  if(text.length>120000)throw Error('추출 텍스트가 12만 자를 넘습니다. 프로젝트별로 나누어 가져와 주세요.');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),x=>x.toString(16).padStart(2,'0')).join('');
  return {name:file.name,sha256:hash,segments,text};
 }
 root.FitDocuments={extract,validateZip};
 if(typeof module!=='undefined')module.exports={validateZip};
})(typeof window!=='undefined'?window:globalThis);
