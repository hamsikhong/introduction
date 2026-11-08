// data.json의 내용을 읽어 페이지에 채워 넣는 코드입니다.
// 내용만 바꿀 때는 이 파일을 건드리지 않아도 됩니다.

const $ = (sel) => document.querySelector(sel);
let data = null;
let filter = '전체';

// 글자 안의 특수문자를 안전하게 바꿔 줍니다.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function isLink(u) { return /^https?:\/\/\S+$/i.test(u || ''); }

// 주소를 넣으면 QR 코드 그림(SVG)을 만들어 줍니다.
function makeQr(text) {
  if (!window.qrcode || !text) return '';
  try {
    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount(), m = 3;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    const size = n + m * 2;
    return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="QR 코드"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
  } catch (e) {
    return '';
  }
}
// QR 이미지 파일을 지정했으면 그 이미지를, 아니면 주소로 QR을 만듭니다.
function qrFor(url, image) {
  if (image) return `<img src="${esc(image)}" alt="QR 코드">`;
  return isLink(url) ? makeQr(url) : '';
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2400);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요'); }
  catch (e) { toast('복사가 막혀 있어요. 주소를 길게 눌러 복사해 주세요'); }
}

function renderProfile() {
  document.title = `${data['이름']} | 바이브코딩 포트폴리오`;
  $('#eyebrow').textContent = [data['학년도'], data['학교']].filter(Boolean).join(' · ');
  $('#name').textContent = data['이름'] || '';
  $('#role').textContent = data['한줄소개'] || '';
  $('#motto').textContent = data['칠판문장'] || '';
  $('#motto-line').hidden = !data['칠판문장'];
  $('#intro').textContent = data['자기소개'] || '';
  $('#tags').innerHTML = (data['관심분야'] || []).map((t) => `<li>${esc(t)}</li>`).join('');
  $('#footer').textContent = `${data['이름'] || ''} · 바이브코딩으로 만든 작품 모음`;

  // 이 페이지 QR: "사이트주소"가 비어 있으면 지금 열려 있는 주소로 만듭니다.
  const siteUrl = isLink(data['사이트주소']) ? data['사이트주소'] : location.href.split('#')[0];
  $('#site-qr').innerHTML = qrFor(siteUrl, data['사이트QR이미지']);
  $('#site-url').textContent = siteUrl;
  $('#copy-site').onclick = () => copy(siteUrl);

  // 연락하기
  const email = data['이메일'], blog = data['블로그'];
  let contact = '';
  if (email) contact += `<span class="addr">${esc(email)}</span><button class="btn small" data-copy="${esc(email)}">이메일 복사</button>`;
  if (isLink(blog)) contact += `<a class="btn small" href="${esc(blog)}" target="_blank" rel="noopener">블로그·채널 ↗</a>`;
  $('#contact-body').innerHTML = contact;
  $('#contact').hidden = !contact;
}

function renderWorks() {
  const works = data['작품'] || [];
  const webN = works.filter((w) => w['종류'] !== '앱').length;
  $('#works-count').textContent = `웹 ${webN} · 앱 ${works.length - webN}`;

  const list = works
    .map((w, i) => ({ ...w, _i: i }))
    .filter((w) => filter === '전체' || (filter === '앱' ? w['종류'] === '앱' : w['종류'] !== '앱'));

  $('#works-grid').innerHTML = list.map((w) => {
    const isApp = w['종류'] === '앱';
    const qr = qrFor(w['주소'], w['QR이미지']);
    return `<article class="card">
      ${w['스크린샷'] ? `<img class="shot" src="${esc(w['스크린샷'])}" alt="${esc(w['이름'])} 화면" loading="lazy">` : ''}
      <div class="card-body">
        <div class="card-top">
          <span class="kind ${isApp ? 'app' : 'web'}">${isApp ? '앱' : '웹사이트'}</span>
          <span class="yr mono">${esc(w['연도'])}</span>
        </div>
        <h3>${esc(w['이름'])}</h3>
        ${w['설명'] ? `<p>${esc(w['설명'])}</p>` : ''}
        ${w['도구'] ? `<p class="tools mono">${esc(w['도구'])}</p>` : ''}
        <div class="card-foot">
          ${isLink(w['주소']) ? `<a class="btn" href="${esc(w['주소'])}" target="_blank" rel="noopener">열어보기 ↗</a>` : '<span class="muted">주소 준비 중</span>'}
          ${qr ? `<button class="qr-thumb" data-zoom="${w._i}" aria-label="${esc(w['이름'])} QR 크게 보기">${qr}</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('') || '<p class="empty">이 분류에는 아직 올린 작품이 없어요.</p>';
}

function renderTraining() {
  const rows = data['연수'] || [];
  const total = rows.reduce((sum, r) => sum + (parseFloat(r['시수']) || 0), 0);
  const teach = rows.filter((r) => r['구분'] === '강의').length;
  $('#training-count').textContent = `총 ${total}시간 · 강의 ${teach}회`;
  $('#training-total').textContent = total;
  $('#training-rows').innerHTML = rows.map((r) => `<tr>
    <td class="date">${esc(r['기간'])}</td>
    <td>${esc(r['연수명'])}</td>
    <td>${esc(r['기관'])}</td>
    <td><span class="tk${r['구분'] === '강의' ? ' teach' : ''}">${esc(r['구분'])}</span></td>
    <td class="num">${esc(r['시수'])}</td>
  </tr>`).join('');
  $('#training').hidden = rows.length === 0;
}

function openZoom(i) {
  const w = data['작품'][i];
  const box = $('#zoom');
  box.innerHTML = `<div class="zoom">
    <h3>${esc(w['이름'])}</h3>
    <div class="qr-big">${qrFor(w['주소'], w['QR이미지'])}</div>
    ${isLink(w['주소']) ? `<div class="u">${esc(w['주소'])}</div>` : ''}
    <button class="btn" data-close>닫기</button>
  </div>`;
  box.showModal();
}

// 버튼 클릭 처리
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filter]');
  if (f) {
    filter = f.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('on', b === f));
    renderWorks();
  }
  const z = e.target.closest('[data-zoom]');
  if (z) openZoom(Number(z.dataset.zoom));
  const c = e.target.closest('[data-copy]');
  if (c) copy(c.dataset.copy);
  if (e.target.closest('[data-close]') || e.target.id === 'zoom') $('#zoom').close();
});

// data.json 불러오기
fetch('data.json', { cache: 'no-cache' })
  .then((res) => res.json())
  .then((json) => {
    data = json;
    renderProfile();
    renderWorks();
    renderTraining();
  })
  .catch(() => {
    $('#name').textContent = '내용을 불러오지 못했어요';
    $('#role').textContent = 'data.json 파일에 쉼표나 따옴표가 빠진 곳이 없는지 확인해 주세요. (컴퓨터에서 index.html을 바로 열면 보이지 않을 수 있어요. 깃허브에 올린 주소로 확인해 주세요.)';
  });
