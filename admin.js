const ADMIN_PW = 'admin123';
const STORAGE_VOTES = 'mc_votes_v1';

function loadVotes(){
  try { return JSON.parse(localStorage.getItem(STORAGE_VOTES) || '[]'); }
  catch(e){ return []; }
}

function buildVotesTable(){
  const votes = loadVotes();
  const thead = document.getElementById('votesThead');
  const tbody = document.getElementById('votesTbody');
  thead.innerHTML=''; tbody.innerHTML='';
  if(!votes.length){ thead.innerHTML='<tr><th>No votes found</th></tr>'; return; }
  const first = votes[0];
  const categories = Object.keys(first).filter(k=>!['id','ts'].includes(k));
  const trh = document.createElement('tr'); ['Vote ID','Timestamp', ...categories].forEach(h=>{ const th=document.createElement('th'); th.textContent=h; trh.appendChild(th); });
  thead.appendChild(trh);
  votes.forEach(v=>{
    const tr = document.createElement('tr');
    const tdid = document.createElement('td'); tdid.textContent = v.id; tr.appendChild(tdid);
    const tdts = document.createElement('td'); tdts.textContent = new Date(v.ts).toLocaleString(); tr.appendChild(tdts);
    categories.forEach(c=>{ const td=document.createElement('td'); td.textContent = v[c] || ''; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
}

function buildSummary(){
  const votes = loadVotes();
  const wrap = document.getElementById('summaryWrap'); wrap.innerHTML='';
  if(!votes.length){ wrap.textContent = 'No votes yet'; return; }
  const first = votes[0];
  const categories = Object.keys(first).filter(k=>!['id','ts'].includes(k));
  const summary = {};
  categories.forEach(c=>summary[c]={});
  votes.forEach(v=>{
    categories.forEach(c=>{
      const name = v[c] || '';
      summary[c][name] = (summary[c][name]||0) + 1;
    });
  });

  const list = document.createElement('div'); list.className='summary-list';
  categories.forEach(cat=>{
    const box = document.createElement('div'); box.className='summary-item';
    const left = document.createElement('div'); left.style.flex='1';
    const title = document.createElement('div'); title.textContent = cat; title.style.fontWeight='700'; left.appendChild(title);
    Object.entries(summary[cat]).forEach(([n,cnt])=>{
      const r = document.createElement('div'); r.className='muted small'; r.textContent = `${n}: ${cnt}`; left.appendChild(r);
    });
    const canvas = document.createElement('canvas'); canvas.width=260; canvas.height=160; canvas.dataset.cat=cat;
    box.appendChild(left); box.appendChild(canvas);
    list.appendChild(box);
  });
  wrap.appendChild(list);

  // render charts
  list.querySelectorAll('canvas').forEach(cv=>{
    const cat = cv.dataset.cat; const data = summary[cat];
    new Chart(cv, {
      type: 'pie',
      data: { labels: Object.keys(data), datasets: [{ data: Object.values(data) }] },
      options: { plugins: { legend: { position: 'bottom' } } }
    });
  });
}

async function exportToExcel(){
  const votes = loadVotes();
  if(!votes.length){ alert('No votes to export'); return; }
  const first = votes[0];
  const categories = Object.keys(first).filter(k=>!['id','ts'].includes(k));
  // Raw sheet
  const header = ['Vote ID','Timestamp', ...categories];
  const raw = [header];
  votes.forEach(v => raw.push([v.id, v.ts, ...categories.map(c=>v[c]||'')]));
  // Summary sheet
  const summary = {};
  categories.forEach(c=>summary[c]={});
  votes.forEach(v=>categories.forEach(c=>{ const n=v[c]||''; summary[c][n]=(summary[c][n]||0)+1 }));
  const summaryAoA = [['Category','Nominee','Votes']];
  categories.forEach(c=>Object.entries(summary[c]).forEach(([n,ct])=> summaryAoA.push([c,n,ct])));

  const wb = XLSX.utils.book_new();
  const wsRaw = XLSX.utils.aoa_to_sheet(raw); XLSX.utils.book_append_sheet(wb, wsRaw, 'Raw Votes');
  const wsSum = XLSX.utils.aoa_to_sheet(summaryAoA); XLSX.utils.book_append_sheet(wb, wsSum, 'Summary');

  const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });

  // turn charts to images
  const canvases = Array.from(document.querySelectorAll('#summaryWrap canvas'));
  const images = await Promise.all(canvases.map(cv => new Promise(res => cv.toBlob(res, 'image/png'))));

  XlsxPopulate.fromDataAsync(new Uint8Array(wbout)).then(workbook=>{
    let sheet = workbook.sheet('Charts'); if(!sheet) sheet = workbook.addSheet('Charts');
    let row = 1;
    images.forEach((blob, i)=>{
      const reader = new FileReader();
      reader.onload = e=>{
        const base64 = e.target.result.split(',')[1];
        workbook.addImage({ image: base64, name: `chart${i+1}`, anchor: { sheet:'Charts', from:{ row, col:1 } } });
        row += 20;
        if(i === images.length-1){
          workbook.outputAsync().then(outBlob=>{
            // download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(outBlob);
            a.download = 'results.xlsx';
            document.body.appendChild(a); a.click(); a.remove();
          });
        }
      };
      reader.readAsDataURL(blob);
    });
  }).catch(err=>{
    console.error(err);
    const blob = new Blob([wbout], { type:'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results.xlsx'; document.body.appendChild(a); a.click(); a.remove();
    alert('Exported workbook without embedded chart images due to a browser limitation. Raw & Summary included.');
  });
}

window.addEventListener('load', ()=>{
  document.getElementById('pwBtn').addEventListener('click', ()=>{
    const v = document.getElementById('pwInput').value;
    if(v === ADMIN_PW){
      document.getElementById('pwBox').hidden = true;
      document.getElementById('adminPanel').hidden = false;
      buildVotesTable(); buildSummary();
    } else {
      alert('Incorrect password');
    }
  });

  document.getElementById('resetBtn').addEventListener('click', ()=>{
    if(confirm('Reset all votes? This cannot be undone.')){
      localStorage.removeItem(STORAGE_VOTES);
      buildVotesTable(); buildSummary();
      alert('Votes cleared.');
    }
  });

  document.getElementById('exportBtn').addEventListener('click', exportToExcel);
});
