(function(root) {
  'use strict';
  const SKILLS = [
    {name:'React', re:/react|리액트/i, tip:'컴포넌트를 나눈 기준과 상태 관리 방식을 설명해 보세요.'},
    {name:'TypeScript', re:/typescript|타입스크립트|\bts\b/i, tip:'타입으로 방지한 오류와 설계한 인터페이스를 남겨 보세요.'},
    {name:'성능 최적화', re:/성능|최적화|렌더링|로딩|캐시|performance|redis/i, tip:'측정 도구, 변경 전후 수치, 측정 환경을 함께 적어 보세요.'},
    {name:'사용자 관점', re:/사용자|접근성|고객|ux|사용성/i, tip:'사용자 문제를 어떻게 발견하고 개선을 확인했는지 적어 보세요.'},
    {name:'협업', re:/협업|코드\s?리뷰|팀|소통|git|협력|디자인/i, tip:'의견이 달랐던 순간과 합의 과정을 구체화해 보세요.'},
    {name:'Python', re:/python|파이썬|fastapi|django/i, tip:'직접 구현한 API와 예외 처리를 설명해 보세요.'},
    {name:'데이터베이스', re:/sql|postgres|mysql|데이터베이스|쿼리|db\b/i, tip:'스키마 설계 이유, 쿼리 실행 계획과 트랜잭션 사례를 적어 보세요.'},
    {name:'API 설계', re:/api|서버|백엔드|rest|인증/i, tip:'인터페이스 설계와 실패 상황 대응을 근거로 남겨 보세요.'},
    {name:'테스트', re:/테스트|검증|jest|pytest|tdd|qa\b/i, tip:'실제로 방지한 회귀 오류와 테스트 범위를 설명해 보세요.'},
    {name:'문제 해결', re:/문제|해결|분석|디버깅|원인|알고리즘/i, tip:'증상, 가설, 검증, 해결의 순서를 정리해 보세요.'},
    {name:'인프라', re:/aws|docker|배포|ci\/cd|kubernetes|인프라/i, tip:'배포 구조와 장애 대응 또는 자동화 사례를 설명해 보세요.'},
    {name:'Java / Spring', re:/\bjava\b|spring|자바|스프링/i, tip:'Spring에서 직접 설계한 책임과 구조를 정리해 보세요.'},
  ];
  const textOf = e => [e.title,e.situation,e.task,e.action,e.result,e.tags].flat().join(' ');
  function match(job, experiences) {
    const wanted=SKILLS.filter(s=>s.re.test(job.text||''));
    return wanted.map(s=>({name:s.name,tip:s.tip,evidence:experiences.filter(e=>s.re.test(textOf(e))).map(e=>({id:e.id,title:e.title,complete:!!(e.action?.trim()&&e.result?.trim()),sample:!!e.sample}))}));
  }
  function rank(job,experiences) {
    const req=match(job,experiences);
    return experiences.map(e=>({...e,matched:req.filter(r=>r.evidence.some(x=>x.id===e.id)).map(r=>r.name)})).sort((a,b)=>b.matched.length-a.matched.length);
  }
  function draft({job,experience,question,style='논리적으로'}) {
    if(!experience) return '';
    const e=experience; const missing=t=>t?.trim()||'[직접 작성해 주세요]';
    const relevant=rank(job,[e])[0].matched;
    const intro=style==='간결하게'?`‘${e.title}’ 경험을 통해 ${relevant.slice(0,2).join(' · ')||'개발'} 관련 문제 해결 과정을 소개합니다.`:`${job.company}의 ${job.role} 직무와 연결해 소개하고 싶은 경험은 ‘${e.title}’입니다. ${relevant.length?`공고에 언급된 ${relevant.slice(0,2).join(' · ')} 관점에서 이 경험을 설명하겠습니다.`:''}`;
    let paragraphs=[intro,`${missing(e.situation)} ${missing(e.task)}`,missing(e.action),missing(e.result)];
    if(/지원.?동기/.test(question||'')) paragraphs.push(`[${job.company}를 선택한 개인적인 이유와 공고의 요구사항을 연결해 작성해 주세요.]`);
    else paragraphs.push(`[이 경험에서 배운 점과 ${job.role} 업무에서 적용할 방법을 직접 작성해 주세요.]`);
    return paragraphs.join('\n\n');
  }
  function review(text,limit) {
    const checks=[
      {name:'구체적인 행동',ok:/구현|설계|분석|개선|검증|비교|측정|실험|테스트|자동화|분리|리팩|개발/.test(text),tip:'팀 전체 성과와 내가 직접 한 일을 구분해 주세요.'},
      {name:'결과 또는 확인 방법',ok:/결과|감소|증가|개선|확인|지표|배포|피드백/.test(text),tip:'실제 결과와 확인 방법을 추가해 주세요. 없는 수치는 만들지 마세요.'},
      {name:'작성 필요 표시 해소',ok:!/[\[\]]/.test(text),tip:'대괄호 안의 내용을 실제 경험으로 채워 주세요.'},
      {name:'글자 수',ok:!!text.trim()&&text.length<=limit,tip:`공백 포함 ${limit}자 이내로 정리해 주세요.`},
    ];
    return checks;
  }
  function interviewReview(text,seconds) {
    if(!text.trim()) return [];
    return [
      {name:'상황 설명',ok:/당시|상황|프로젝트|문제|과제|경험/.test(text),tip:'어떤 상황에서 생긴 문제였는지 한 문장으로 시작해 보세요.'},
      {name:'나의 행동',ok:/제가|저는|구현|분석|설계|해결|비교|검증/.test(text),tip:'본인이 선택한 방법과 선택 이유를 이야기해 보세요.'},
      {name:'결과와 회고',ok:/결과|배웠|배운|확인|개선|다음|회고/.test(text),tip:'결과와 다시 한다면 바꿀 점으로 마무리해 보세요.'},
      {name:'답변 분량',ok:text.length>=100,tip:'배경, 본인의 행동, 결과가 포함될 정도로 답변을 확장해 보세요.'},
    ];
  }
  const api={SKILLS,match,rank,draft,review,interviewReview,textOf};
  if(typeof module!=='undefined') module.exports=api;
  root.FitEngine=api;
})(typeof window!=='undefined'?window:globalThis);
