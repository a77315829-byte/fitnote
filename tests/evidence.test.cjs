const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('./load-browser.cjs')('evidence.js');
const e={id:'self',title:'조회 API 개선',situation:'목록 API가 느렸습니다.',task:'저는 서버 개발을 맡았습니다.',action:'실행 계획을 비교하고 인덱스를 추가했습니다.',result:'같은 환경에서 응답 시간이 200ms에서 120ms로 줄었습니다.',sample:false,reviewed:true};
const job={id:'j',company:'예시 기업',role:'백엔드 개발',text:'SQL 성능 분석'};
test('구성한 본문은 입력 원문과 출처를 보존한다',()=>{const d=P.compose({job,experience:e});assert.equal(d.sources.filter(s=>s.kind!=='context').length,4);assert.ok(d.text.includes(e.result));assert.ok(P.audit(d.text,d.sources).filter(r=>r.status==='exact').length===4);});
test('기록과 문자 일치해도 예시 경험은 제출용 사실로 인정하지 않는다',()=>{const d=P.compose({job,experience:{...e,sample:true}});assert.equal(P.audit(d.text,d.sources).filter(r=>r.status==='sample').length,4);});
const adversarial=[
 ['수치 부풀리기','응답 시간을 99% 줄였습니다. 〔E4〕','changed'],
 ['주체 바꾸기','저는 전체 팀을 총괄했습니다. 〔E2〕','changed'],
 ['부정문 뒤집기','인덱스를 추가하지 않았습니다. 〔E3〕','changed'],
 ['새 기술 추가','Redis를 도입했습니다. 〔E3〕','changed'],
 ['인용 번호 위조','100만 명에게 서비스했습니다. 〔E99〕','invalid'],
 ['인용 없이 성과 추가','대기업의 채용률이 90% 높아졌습니다.','review'],
 ['인용 없이 타당한 사실을 써도 자동 승인하지 않기',e.action,'review'],
 ['빈칸을 없던 사실로 채우지 않기','[실제 측정값 입력]','missing'],
 ['한 문단에 추가 주장 섞기',e.action+' 업계 최고 성과입니다. 〔E3〕','changed'],
 ['여러 인용을 붙여도 자동 통과하지 않기',e.action+' 〔E3〕 〔E4〕','changed'],
];
for(const[name,text,status]of adversarial)test(name,()=>assert.equal(P.audit(text,P.compose({job,experience:e}).sources)[0].status,status));
test('추가 수치는 인용한 출처에서 찾으며 다른 출처로 정당화하지 않는다',()=>{const sources=P.compose({job,experience:e}).sources;assert.equal(P.audit('응답 시간이 120ms입니다. 〔E3〕',sources)[0].addedNumbers[0],'120ms');});
test('동결한 근거를 이후 경험 수정으로 덮어쓰지 않는다',()=>{const mutable={...e};const d=P.compose({job,experience:mutable});mutable.action='새 행동';assert.equal(d.sources.find(f=>f.field==='action').text,e.action);});
test('문서 위치는 해당 원문이 남아 있을 때만 연결한다',()=>{const original={...e,origins:{name:'자체 예시.pdf',segments:[{label:'PDF 2쪽',text:e.action}],sha256:'abcd'}};assert.match(P.facts(original).find(f=>f.field==='action').source,/PDF 2쪽/);assert.ok(!P.facts({...original,action:'원문과 달라진 설명'}).find(f=>f.field==='action').source.includes('PDF 2쪽'));});
test('연결한 공고 내용이 바뀌면 이전 연결 이유를 그대로 인정하지 않는다',()=>{const links=[{jobId:'j',experienceId:'self',requirement:'SQL 성능 분석',reason:'실행 계획을 비교한 경험'}];assert.equal(P.rubric(e,job,links).find(r=>r.id==='fit').state,'recorded');assert.equal(P.rubric(e,{...job,text:'보안 감사'},links).find(r=>r.id==='fit').state,'missing');});
test('프로젝트 후보 분리는 원문을 요약하거나 성과를 만들지 않는다',()=>{const text='# 조회 API\n인덱스를 추가했습니다.\n# 배포 자동화\n테스트를 실행했습니다.';const chunks=P.splitProjects(text);assert.equal(chunks.length,2);assert.ok(chunks[0].text.includes('인덱스를 추가했습니다.'));});
test('AI가 언급된 공고에는 AI 결과의 본인 검증 질문을 추가한다',()=>assert.ok(P.followups(e,{text:'AI Native'}).some(q=>q.name==='AI 사용 검증')));
