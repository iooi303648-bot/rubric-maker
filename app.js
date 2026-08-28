const form = document.querySelector('#rubricForm');
const panels = [...document.querySelectorAll('[data-panel]')];
const steps = [...document.querySelectorAll('.step')];
const questionsEl = document.querySelector('#questions');
const template = document.querySelector('#questionTemplate');
const resultSection = document.querySelector('#resultSection');
const output = document.querySelector('#rubricOutput');
const STORAGE_KEY = 'rubric-maker-draft-v1';
let currentStep = 1;
let latestData = null;

const sample = {
  subject:'사회', grade:'6학년 1학기', domain:'한국사', unit:'평화 통일을 위한 노력', assessmentType:'서술형·논술형', literacy:['통합 및 해석','평가 및 적용'],
  standard:'[6사07-01] 분단으로 나타난 문제점과 분단과 관련된 장소를 평화의 장소로 만들려는 노력 등을 알아보고, 평화 통일을 위해 우리가 할 수 있는 일을 탐색한다.',
  assessmentContent:'분단으로 나타난 문제점과 평화의 장소를 만들려는 노력을 알아보고, 평화 통일을 위해 우리가 할 수 있는 일을 탐색한다.',
  coreIdea:'역사 문제를 해결하면서 역사적 주체로서 실천하는 태도를 갖는다.', contentElements:'분단으로 인해 나타난 문제점 이해\n역사적 증거를 토대로 자료 분석 및 판단\n평화 통일을 위한 실천 태도', levelCount:'3', commonRule:'예시 답안과 표현이 달라도 내용과 논리가 타당하면 정답으로 인정한다.', feedback:'근거가 부족할 때에는 자료의 핵심어를 찾고, 자신의 주장과 연결해 다시 설명하도록 안내한다.',
  questions:[
    {prompt:'분단으로 인해 나타난 문제점을 2가지 쓰시오.',element:'분단으로 인해 나타난 문제점 파악',maxScore:'2',evidence:'이산가족의 아픔, 전쟁 공포, 국력 낭비, 남북 갈등 심화 중 타당한 2가지',note:'예시와 다른 문제점도 분단과의 인과관계가 타당하면 인정'},
    {prompt:'분단과 관련된 장소를 하나 골라 과거의 아픔과 현재의 가치를 담은 소개 글을 쓰시오.',element:'과거와 현재의 가치를 근거로 장소 설명',maxScore:'2',evidence:'장소 선택, 과거의 역사적 아픔, 현재의 평화적 가치',note:'비무장 지대·판문점 외 장소도 근거가 타당하면 인정'},
    {prompt:'통일이 필요한 까닭과 우리 반에서 실천할 수 있는 활동을 각각 쓰시오.',element:'평화 통일의 필요성과 실천 활동 제안',maxScore:'2',evidence:'통일의 필요성, 학급에서 실행 가능한 구체적 활동',note:'실천 가능성과 평화 통일의 취지가 드러나야 함'}
  ]
};

function addQuestion(data={}){
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.question-card');
  Object.entries(data).forEach(([key,value])=>{const el=card.querySelector(`[data-key="${key}"]`);if(el)el.value=value;});
  card.querySelector('.remove-question').addEventListener('click',()=>{if(questionsEl.children.length===1){toast('문항은 최소 1개가 필요해요.');return;}card.remove();renumberQuestions();saveDraft();});
  card.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',saveDraft));
  questionsEl.appendChild(card);renumberQuestions();
}
function renumberQuestions(){[...questionsEl.children].forEach((card,i)=>card.querySelector('.question-badge').textContent=`문항 ${i+1}`);}
function questionData(){return [...questionsEl.children].map(card=>Object.fromEntries([...card.querySelectorAll('[data-key]')].map(el=>[el.dataset.key,el.value.trim()])));}
function getData(){const fd=new FormData(form);return {subject:fd.get('subject')?.trim(),grade:fd.get('grade')?.trim(),domain:fd.get('domain')?.trim(),unit:fd.get('unit')?.trim(),assessmentType:fd.get('assessmentType'),literacy:fd.getAll('literacy'),standard:fd.get('standard')?.trim(),assessmentContent:fd.get('assessmentContent')?.trim(),coreIdea:fd.get('coreIdea')?.trim(),contentElements:fd.get('contentElements')?.trim(),levelCount:fd.get('levelCount'),commonRule:fd.get('commonRule')?.trim(),feedback:fd.get('feedback')?.trim(),questions:questionData()};}
function setData(data){form.reset();questionsEl.innerHTML='';Object.entries(data).forEach(([key,value])=>{if(key==='questions'||key==='literacy')return;const el=form.elements[key];if(el)el.value=value||'';});document.querySelectorAll('[name="literacy"]').forEach(el=>el.checked=(data.literacy||[]).includes(el.value));(data.questions?.length?data.questions:[{}]).forEach(addQuestion);updateReview();saveDraft();}
function saveDraft(){clearTimeout(saveDraft.timer);document.querySelector('#saveState').textContent='저장 중…';saveDraft.timer=setTimeout(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(getData()));document.querySelector('#saveState').textContent='저장됨';},250);}
function validateStep(step){const panel=panels.find(p=>+p.dataset.panel===step);const fields=[...panel.querySelectorAll('[required]')];let valid=true;fields.forEach(el=>{if(!el.value.trim()){el.classList.add('invalid');valid=false;}else el.classList.remove('invalid');});if(!valid){fields.find(el=>el.classList.contains('invalid'))?.focus();toast('별표가 있는 필수 정보를 채워 주세요.');}return valid;}
function showStep(step){currentStep=step;panels.forEach(p=>p.classList.toggle('active',+p.dataset.panel===step));steps.forEach(s=>s.classList.toggle('active',+s.dataset.step===step));document.querySelector('#prevStep').hidden=step===1;document.querySelector('#nextStep').hidden=step===4;document.querySelector('#generate').hidden=step!==4;if(step===4)updateReview();document.querySelector('.workspace').scrollIntoView({behavior:'smooth',block:'start'});}
function updateReview(){const d=getData();const total=d.questions.reduce((sum,q)=>sum+(Number(q.maxScore)||0),0);document.querySelector('#reviewBox').innerHTML=`<b>생성 전 확인</b><ul><li>${escapeHtml(d.subject||'교과 미입력')} · ${escapeHtml(d.grade||'학년 미입력')} · ${escapeHtml(d.unit||'단원 미입력')}</li><li>성취기준 ${d.standard?'입력 완료':'미입력'} / 문항 ${d.questions.length}개 / 총 ${total}점</li><li>각 문항의 기대 답안 핵심을 기준으로 단계별 수행 특성을 생성합니다.</li><li>고유명사·통계·인용은 자동으로 만들지 않습니다. 입력한 근거의 사실성은 최종 확인해 주세요.</li></ul>`;}
function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function keyPoints(text){return text.split(/[\n,]/).map(v=>v.trim()).filter(Boolean);}
function descriptors(q){const pts=keyPoints(q.evidence), max=Number(q.maxScore);const label=pts.join(', ')||'기대 수행';const rows=[];for(let score=max;score>=0;score--){let desc;if(score===0)desc='무응답이거나, 문항의 요구와 관련 없는 내용을 작성한 경우';else if(score===max)desc=`${label}을(를) 모두 포함하고, 문항의 요구에 맞게 정확하고 논리적으로 표현한 경우`;else{const ratio=score/max;desc=ratio>=.67?`${label}의 대부분을 포함하고 설명의 흐름이 대체로 타당한 경우`:`${label} 중 일부를 포함했으나 설명이나 근거가 충분하지 않은 경우`;}rows.push({score,desc});}return rows;}
function levelRanges(total,count){if(count===4){const a=Math.ceil(total*.85),b=Math.ceil(total*.65),c=Math.ceil(total*.4);return [[`매우 우수`,`${a}–${total}점`],[`우수`,`${b}–${a-1}점`],[`보통`,`${c}–${b-1}점`],[`노력 필요`,`0–${c-1}점`]];}const high=Math.ceil(total*.8),mid=Math.ceil(total*.5);return [['상',`${high}–${total}점`],['중',`${mid}–${high-1}점`],['하',`0–${mid-1}점`]];}
function renderRubric(d){const total=d.questions.reduce((sum,q)=>sum+Number(q.maxScore),0);const rows=d.questions.map((q,qi)=>descriptors(q).map((r,ri)=>`<tr>${ri===0?`<td rowspan="${Number(q.maxScore)+1}" class="score">${qi+1}</td><td rowspan="${Number(q.maxScore)+1}" contenteditable="true">${escapeHtml(q.element)}</td>`:''}<td class="score">${r.score}</td><td contenteditable="true">${escapeHtml(r.desc)}</td>${ri===0?`<td rowspan="${Number(q.maxScore)+1}" contenteditable="true">${escapeHtml(q.note||d.commonRule||'내용과 논리가 타당한 다른 답안도 인정한다.')}</td>`:''}</tr>`).join('')).join('');const levels=levelRanges(total,Number(d.levelCount)).map(([name,range])=>`<div class="level-chip">${name} · ${range}</div>`).join('');output.innerHTML=`<div class="rubric-title"><h2>서·논술형 평가 채점 루브릭</h2><p>${escapeHtml(d.subject)} · ${escapeHtml(d.grade)} · ${escapeHtml(d.unit)}</p></div><table class="meta-table"><tr><th>교과</th><td>${escapeHtml(d.subject)}</td><th>학년·학기</th><td>${escapeHtml(d.grade)}</td><th>영역</th><td>${escapeHtml(d.domain||'-')}</td></tr><tr><th>단원</th><td colspan="3">${escapeHtml(d.unit)}</td><th>평가유형</th><td>${escapeHtml(d.assessmentType)}</td></tr><tr><th>문해력 요소</th><td colspan="5">${escapeHtml(d.literacy.join(', ')||'-')}</td></tr><tr><th>성취기준</th><td colspan="5">${escapeHtml(d.standard)}</td></tr><tr><th>평가 내용</th><td colspan="5">${escapeHtml(d.assessmentContent)}</td></tr></table><table class="rubric-table"><thead><tr><th>문항</th><th>채점요소</th><th>척도</th><th>척도별 수행 특성</th><th>유의점</th></tr></thead><tbody>${rows}</tbody></table><div class="level-summary" style="grid-template-columns:repeat(${d.levelCount},1fr)">${levels}</div><div class="rubric-notes"><b>공통 채점 원칙</b><br>${escapeHtml(d.commonRule||'예시와 표현이 달라도 성취기준과 문항의 의도에 맞고 근거가 타당하면 인정한다.')}<br><br><b>피드백 방향</b><br>${escapeHtml(d.feedback||'학생의 현재 수행에서 확인되는 강점을 먼저 제시하고, 다음 수준으로 성장하기 위한 구체적인 행동을 안내한다.')}<br><small>※ 점수 구간은 자동 제안값입니다. 학교 상황과 학생 수준에 따라 학년협의체에서 조정해 사용하세요.</small></div>`;}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2200);}
document.querySelector('#addQuestion').addEventListener('click',()=>{addQuestion();saveDraft();});
document.querySelector('#nextStep').addEventListener('click',()=>{if(validateStep(currentStep))showStep(currentStep+1);});
document.querySelector('#prevStep').addEventListener('click',()=>showStep(currentStep-1));
steps.forEach(step=>step.addEventListener('click',()=>{const target=+step.dataset.step;if(target<=currentStep||validateStep(currentStep))showStep(target);}));
form.addEventListener('input',e=>{e.target.classList.remove('invalid');saveDraft();});
form.addEventListener('submit',e=>{e.preventDefault();if(!validateStep(4))return;latestData=getData();const total=latestData.questions.reduce((sum,q)=>sum+Number(q.maxScore),0);if(Number(latestData.levelCount)===4&&total<4){toast('4수준을 쓰려면 총점이 4점 이상이어야 해요.');return;}renderRubric(latestData);resultSection.hidden=false;resultSection.scrollIntoView({behavior:'smooth'});});
document.querySelector('#loadSample').addEventListener('click',()=>{setData(sample);showStep(1);toast('예시 자료를 불러왔어요.');});
document.querySelector('#editAgain').addEventListener('click',()=>{document.querySelector('.workspace').scrollIntoView({behavior:'smooth'});});
document.querySelector('#printRubric').addEventListener('click',()=>window.print());
document.querySelector('#exportJson').addEventListener('click',()=>{if(!latestData)return;const blob=new Blob([JSON.stringify(latestData,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${latestData.subject}_${latestData.unit}_루브릭.json`;a.click();URL.revokeObjectURL(a.href);});
const draft=localStorage.getItem(STORAGE_KEY);if(draft){try{setData(JSON.parse(draft));}catch{addQuestion();}}else addQuestion();
