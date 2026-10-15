(function(root) {
  'use strict';
  const VERSION='fitnote-evidence-1.0';
  const FIELDS={situation:'상황',task:'내 역할',action:'내 행동',result:'결과·확인 방법'};
  const SOURCES=[
    {id:'opm-job',name:'OPM · Job Analysis',kind:'공식 가이드',url:'https://www.opm.gov/policy-data-oversight/assessment-and-selection/job-analysis/',rule:'공고의 업무와 요구 역량을 먼저 정리하고, 경험과 연결한 이유를 남깁니다.',limit:'미국 공공부문의 직무분석 가이드입니다. 한국 기업의 실제 평가표를 뜻하지 않습니다.'},
    {id:'opm-interview',name:'OPM · Structured Interviews',kind:'공식 가이드',url:'https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/',rule:'같은 프로젝트에 상황·본인 행동·결과·대안 질문을 일관되게 적용합니다.',limit:'자기소개서의 합격 효과나 STAR 형식의 우월성을 입증하는 자료로 사용하지 않습니다.'},
    {id:'factscore',name:'FActScore · Min et al., EMNLP 2023',kind:'논문',url:'https://aclanthology.org/2023.emnlp-main.741/',rule:'긴 글을 작은 주장 단위로 나누어 각 주장에 출처가 있는지 확인합니다.',limit:'원 연구의 인물 소개 평가를 참고한 설계입니다. 이 앱은 FActScore 모델이나 점수를 구현하지 않았습니다.'},
    {id:'alce',name:'ALCE · Gao et al., EMNLP 2023',kind:'논문·벤치마크',url:'https://aclanthology.org/2023.emnlp-main.398/',rule:'읽기 좋은 문장과 인용의 품질을 구분합니다. 인용이 있어도 원문을 바꾼 문장은 다시 확인합니다.',limit:'영어 질의응답 벤치마크입니다. 한국어 자소서 품질·합격 여부로 일반화할 수 없습니다.'},
    {id:'fever',name:'FEVER · Thorne et al., NAACL 2018',kind:'논문·데이터셋',url:'https://fever.ai/dataset/fever.html',rule:'근거가 부족한 경우를 별도로 남깁니다. 출처가 없는 문장을 사실이라고 표시하지 않습니다.',limit:'Wikipedia 기반 주장 185,445개입니다. 채용 데이터가 아니며 앱에 원문 데이터를 넣거나 학습하지 않았습니다.'},
    {id:'onet',name:'O*NET® 31.0 Database',kind:'공개 직업 데이터',url:'https://www.onetcenter.org/database.html',rule:'직무·기술·업무활동을 분리하는 참고 사전 후보로 기록했습니다.',limit:'미국 직업 데이터입니다. 현재 앱의 기술 사전은 자체 작성했으며 O*NET 데이터를 가져오지 않았습니다.'},
  ];
  const clean=t=>String(t||'').replace(/\r\n/g,'\n').trim();
  const strip=t=>String(t||'').replace(/〔[^〕\n]*〕/g,'').trim();
  const norm=t=>clean(t).replace(/\s+/g,' ');
  function requirements(job={}) {
    if(Array.isArray(job.requirements)&&job.requirements.length) return job.requirements.map((r,i)=>({id:'R'+(i+1),text:typeof r==='string'?r:r.text,quote:r.quote||'',sourceUrl:job.url||''}));
    return clean(job.text).split('\n').map(t=>t.replace(/^[-•·\s]+/,'').trim()).filter(t=>t.length>4&&!/^\[|^접수|^마감|^확인일|^출처/.test(t)).slice(0,12).map((text,i)=>({id:'R'+(i+1),text,quote:text,sourceUrl:job.url||''}));
  }
  function facts(experience) {
    if(!experience)return [];
    return Object.entries(FIELDS).filter(([field])=>clean(experience[field])).map(([field,label],i)=>{
      const text=clean(experience[field]);
      const origin=experience.origins?.segments?.find(s=>norm(s.text).includes(norm(text)));
      return {id:'E'+(i+1),field,label,text,experienceId:experience.id,sample:!!experience.sample,reviewed:!!experience.reviewed,
        source:origin?`${experience.origins.name} · ${origin.label}`:'내 경험 기록 · '+label,
        sourceUrl:experience.evidenceUrl||'',note:experience.evidenceNote||'',hash:origin?experience.origins.sha256||'':''};
    });
  }
  function compose({job={},experience,question='',order}={}) {
    const bank=facts(experience);
    if(!bank.length)return {text:'',sources:[],policyVersion:VERSION};
    const opening=`${job.company||'지원 기업'}의 ${job.role||'개발'} 직무에 연결해 소개할 경험은 ‘${experience.title}’입니다.`;
    const context={id:'C1',field:'context',label:'연결 문장',text:opening,source:'선택한 기업·직무·경험 제목',kind:'context'};
    const selected=order?order.map(id=>bank.find(f=>f.id===id)).filter(Boolean):bank;
    const conclusion=/지원.?동기/.test(question)?`[이 기업을 선택한 본인의 이유와, 공고의 어떤 업무에 이 경험을 적용할지 작성해 주세요.]`:'[배운 점과 지원 업무에 적용할 방법을 직접 작성해 주세요.]';
    return {text:[opening+' 〔C1〕',...selected.map(f=>f.text+` 〔${f.id}〕`),...Object.keys(FIELDS).filter(k=>!clean(experience[k])).map(k=>`[${FIELDS[k]}을 직접 작성해 주세요.]`),conclusion].join('\n\n'),sources:[context,...bank],policyVersion:VERSION};
  }
  function audit(text,snapshot=[]) {
    const bank=new Map(snapshot.map(f=>[f.id,f]));
    return clean(text).split(/\n\s*\n/).filter(Boolean).map((paragraph,i)=>{
      const ids=[...paragraph.matchAll(/〔([^〕\n]+)〕/g)].map(m=>m[1]);
      const cited=ids.map(id=>bank.get(id)).filter(Boolean);
      const content=strip(paragraph);
      let status='review',message='출처 표시가 없습니다. 실제 기록과 직접 대조해 주세요.';
      if(/\[[^\]]*\]/.test(content)){status='missing';message='직접 채워야 할 내용입니다.';}
      else if(ids.some(id=>!bank.has(id))){status='invalid';message='존재하지 않는 출처 번호입니다.';}
      else if(ids.length===1&&norm(content)===norm(cited[0]?.text)) {
        if(cited[0].kind==='context'){status='context';message='기업·직무·제목으로 만든 연결 문장입니다. 업무 적합성의 증명이 아닙니다.';}
        else if(cited[0].sample){status='sample';message='예시 기록과 일치합니다. 실제 지원에 사용할 수 없습니다.';}
        else {status='exact';message='저장된 원문과 일치합니다. 기록 자체의 사실 여부는 본인이 확인해야 합니다.';}
      } else if(ids.length){status='changed';message='인용한 원문과 표현이 다릅니다. 의미·주체·수치를 다시 확인해 주세요.';}
      const numbers=content.match(/\d+(?:[.,]\d+)*(?:\s*(?:%|ms|초|명|배|건|개|개월|년))?/g)||[];
      const sourceText=cited.map(f=>f.text).join(' ');
      const addedNumbers=ids.length?numbers.filter(n=>!sourceText.includes(n)):numbers;
      return {index:i,text:content,ids,status,message,addedNumbers,sources:cited};
    });
  }
  function rubric(experience,job,links=[]) {
    const e=experience||{},rs=requirements(job);
    const confirmed=links.filter(l=>l.jobId===job?.id&&l.experienceId===e.id&&rs.some(r=>r.text===l.requirement));
    return [
      {id:'source',name:'출처와 본인 확인',state:e.reviewed&&!e.sample?'recorded':'missing',detail:e.sample?'예시 경험입니다. 본인의 기록으로 교체하세요.':e.reviewed?'본인 검토 표시가 있습니다. 외부 검증을 완료했다는 뜻은 아닙니다.':'경험 원문을 검토한 뒤 본인 확인을 표시하세요.',basis:'fever'},
      {id:'role',name:'팀 성과와 내 역할 구분',state:clean(e.task)&&clean(e.action)?'recorded':'missing',detail:'역할·행동 항목의 입력 여부만 확인합니다. 팀 전체 성과와 본인 기여의 구분은 직접 검토하세요.',basis:'opm-interview'},
      {id:'action',name:'행동과 선택의 이유',state:clean(e.action)?'recorded':'missing',detail:'무엇을 구현했는지, 대안과 무엇을 비교했는지 설명하세요. 기술명만 적은 기록은 설명이 부족합니다.',basis:'opm-job'},
      {id:'result',name:'결과와 확인 방법',state:clean(e.result)?'recorded':'missing',detail:'결과·테스트·피드백을 남기세요. 정성적 결과도 가능하며, 미측정 수치를 만들어 넣지 않습니다.',basis:'factscore'},
      {id:'fit',name:'공고와 연결한 이유',state:confirmed.length?'recorded':'missing',detail:confirmed.length?confirmed.map(l=>l.reason).join(' / '):'지원 전략 화면에서 요구사항 하나와 경험을 연결하고 이유를 적어 주세요.',basis:'opm-job'},
      {id:'claim',name:'주장마다 원문 대조',state:'review',detail:'아래 문장별 근거에서 출처, 표현 변경과 추가 수치를 확인하세요. 자동 점검은 의미의 참·거짓을 판정하지 않습니다.',basis:'alce'},
    ];
  }
  function followups(e={},job={}) {
    const list=[
      {name:'내 기여',question:`‘${e.title||'프로젝트'}’에서 팀 전체 결과와 본인이 직접 만든 부분을 어떻게 구분할 수 있나요?`,basis:'내 역할·행동 기록'},
      {name:'기술 선택',question:'선택한 기술과 비교한 대안은 무엇이며, 그 선택의 비용이나 한계는 무엇인가요?',basis:'선택의 이유'},
      {name:'검증',question:e.evidenceNote?`‘${e.evidenceNote.slice(0,80)}’에서 결과를 확인할 수 있는 위치와 검증 방법을 설명해 주세요.`:'결과를 확인한 테스트·측정 환경·피드백은 무엇이며, 아직 확인하지 못한 것은 무엇인가요?',basis:'결과·확인 방법'},
      {name:'공고 연결',question:`${job.company||'기업'}의 ${job.role||'지원 직무'} 업무 중 어느 문제에 이 경험을 적용할 수 있나요? 그 연결은 본인의 해석임을 구분해 설명해 주세요.`,basis:'공고의 업무와 경험'},
    ];
    if(/AI|인공지능|LLM/i.test(job.text||''))list.push({name:'AI 사용 검증',question:'AI가 제안한 내용 중 틀렸거나 수정한 사례는 무엇인가요? 본인이 확인한 코드·테스트와 AI가 담당한 부분을 구분해 주세요.',basis:'공고에 AI가 언급됨'});
    return list;
  }
  function splitProjects(text) {
    const lines=clean(text).split('\n');const chunks=[];let current=[];
    for(const line of lines){if(/^#{1,3}\s+|^(?:프로젝트|Project)\s*[:：]|^\[프로젝트/i.test(line)&&current.join('\n').trim()){chunks.push(current.join('\n').trim());current=[];}current.push(line);}
    if(current.join('\n').trim())chunks.push(current.join('\n').trim());
    return chunks.slice(0,20).map((body,i)=>({title:body.split('\n')[0].replace(/^#+\s*/, '').slice(0,120)||`프로젝트 ${i+1}`,text:body}));
  }
  const api={VERSION,FIELDS,SOURCES,facts,requirements,compose,audit,rubric,followups,strip,splitProjects};
  if(typeof module!=='undefined')module.exports=api;
  root.FitEvidence=api;
})(typeof window!=='undefined'?window:globalThis);
