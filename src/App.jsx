import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, XCircle, TrendingUp, Home, User, DollarSign, BarChart3, Info } from 'lucide-react';

export default function MortgageSimulator() {
const [tab, setTab] = useState(0);
const [visited, setVisited] = useState(new Set([0]));
const [showDisclaimer, setShowDisclaimer] = useState(false);
const [showRunningDetail, setShowRunningDetail] = useState(false);

const goTab = (i) => {
setTab(i);
setVisited(prev => new Set([...prev, i]));
};

const allInputVisited = [0, 1, 2].every(i => visited.has(i));

const [propertyPrice, setPropertyPrice] = useState(50000000);
const [downPayment, setDownPayment] = useState(10000000);
const [propertyType, setPropertyType] = useState('mansion');
const [managementFee, setManagementFee] = useState(20000);
const [repairReserve, setRepairReserve] = useState(15000);
const [annualIncome, setAnnualIncome] = useState(6000000);
const [age, setAge] = useState(35);
const [monthlyLiving, setMonthlyLiving] = useState(200000);
const [rateType, setRateType] = useState('variable');
const [interestRate, setInterestRate] = useState(0.6);
const [fixedRate, setFixedRate] = useState(1.8);
const [loanPeriod, setLoanPeriod] = useState(35);

const loanAmount = Math.max(0, propertyPrice - downPayment);
const compAge = age + loanPeriod;

const runningDetail = useMemo(() => {
const tax = (propertyPrice * 0.01) / 12;
const ins = 20000 / 12;
const repair = propertyType === 'mansion' ? repairReserve : 20000;
const mgmt = propertyType === 'mansion' ? managementFee : 0;
return { tax, ins, repair, mgmt };
}, [propertyPrice, propertyType, managementFee, repairReserve]);

const monthlyRunning = useMemo(() => {
const { tax, ins, repair, mgmt } = runningDetail;
return tax + ins + repair + mgmt;
}, [runningDetail]);

const takeHome = useMemo(() => {
const inc = annualIncome;
if (inc <= 0) return 0;
const si = inc * 0.15;
let sd = inc <= 1625000 ? 550000 : inc <= 1800000 ? inc*0.4-100000 : inc <= 3600000 ? inc*0.3+80000 : inc <= 6600000 ? inc*0.2+440000 : inc <= 8500000 ? inc*0.1+1100000 : 1950000;
const sal = inc - sd;
const tit = Math.max(0, sal - si - 480000);
let it = tit <= 1950000 ? tit*0.05 : tit <= 3300000 ? tit*0.1-97500 : tit <= 6950000 ? tit*0.2-427500 : tit <= 9000000 ? tit*0.23-636000 : tit <= 18000000 ? tit*0.33-1536000 : tit*0.4-2796000;
return inc - si - Math.max(0,it)*1.021 - (Math.max(0,sal-si-430000)*0.1+5000);
}, [annualIncome]);

const calcLoan = (p, r, y) => {
if (p <= 0) return { mp: 0, total: 0, interest: 0, schedule: [] };
const mr = r/100/12, n = y*12;
const mp = p*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1);
let rem = p, ti = 0, sc = [];
for (let m = 1; m <= n; m++) {
const i = rem*mr; rem = Math.max(0, rem-(mp-i)); ti += i;
if (m%12===0) sc.push({ year: m/12, 残高: Math.round(rem), 累計利息: Math.round(ti) });
}
return { mp: Math.round(mp), total: Math.round(p+ti), interest: Math.round(ti), schedule: sc };
};

const ar = rateType === 'variable' ? interestRate : fixedRate;
const loan = useMemo(() => calcLoan(loanAmount, ar, loanPeriod), [loanAmount, ar, loanPeriod]);

// FIX: 控除期間をloanPeriodと13の小さい方で割る
const ded = useMemo(() => {
const dedYears = Math.min(13, loanPeriod);
let t = 0;
for (let y = 1; y <= dedYears; y++) {
const d = loan.schedule.find(s => s.year === y);
if (d) t += Math.min(d.残高 * 0.007, 210000);
}
return Math.round(t);
}, [loan, loanPeriod]);

const dedYears = Math.min(13, loanPeriod);
const dedMonthly = dedYears > 0 ? ded / dedYears / 12 : 0;

const ana = useMemo(() => {
const mth = takeHome / 12;
const burden = loan.mp + monthlyRunning - dedMonthly;
const ratio = annualIncome > 0 ? ((loan.mp*12 + monthlyRunning*12 - (dedYears > 0 ? ded/dedYears : 0)) / annualIncome)*100 : 0;
const surplus = mth - monthlyLiving - burden;
const sr = mth > 0 ? (surplus/mth)*100 : 0;
const rs = ratio<=25?'g':ratio<=35?'w':'b';
const as = compAge<=70?'g':compAge<=80?'w':'b';
const ss = sr>=20?'g':sr>=10?'w':'b';
const all = [rs,as,ss].every(x=>x==='g')?'g':[rs,as,ss].some(x=>x==='b')?'b':'w';
return { mth, burden, ratio, rs, compAge, as, surplus, sr, ss, all };
}, [loan, takeHome, annualIncome, compAge, monthlyLiving, monthlyRunning, ded, dedMonthly, dedYears]);

const risks = useMemo(() => rateType !== 'variable' ? null : [1,2,3].map(d => ({
d, mp: calcLoan(loanAmount, interestRate+d, loanPeriod).mp
})), [rateType, loanAmount, interestRate, loanPeriod]);

const M = (n) => {
const a = Math.abs(n);
if (a >= 100000000) return (n/100000000).toFixed(1)+'億円';
if (a >= 10000) return Math.round(n/10000)+'万円';
return new Intl.NumberFormat('ja-JP').format(Math.round(n))+'円';
};
const col = s => s==='g'?'#10b981':s==='w'?'#f59e0b':'#ef4444';
const SI = ({s}) => s==='g'?<CheckCircle size={15}/>:s==='w'?<AlertCircle size={15}/>:<XCircle size={15}/>;

// FIX: min 12px、aria-label追加
const Sl = ({ label, value, min, max, step: st, onChange, fmt, note, ariaLabel }) => (
<div style={{ marginBottom: '18px' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
<div>
<div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{label}</div>
{note && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>{note}</div>}
</div>
<span style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>{fmt(value)}</span>
</div>
<input
type="range" className="sl"
min={min} max={max} step={st} value={value}
onChange={e => onChange(Number(e.target.value))}
aria-label={ariaLabel || label}
aria-valuetext={fmt(value)}
/>
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginTop: '3px' }}>
<span>{fmt(min)}</span><span>{fmt(max)}</span>
</div>
</div>
);

const Tog = ({ options, value, onChange }) => (
<div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
{options.map(o => (
<button key={o.v} onClick={() => onChange(o.v)} aria-pressed={value===o.v} style={{ flex: 1, padding: '10px', border: '2px solid', borderColor: value===o.v?'#2563eb':'#e2e8f0', background: value===o.v?'#2563eb':'white', color: value===o.v?'white':'#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all .15s' }}>
{o.l}
</button>
))}
</div>
);

const InfoBox = ({ children, color='#f0f9ff', textColor='#0369a1' }) => (
<div style={{ padding: '9px 12px', background: color, borderRadius: '8px', fontSize: '13px', color: textColor, lineHeight: 1.6, marginBottom: '18px' }}>
{children}
</div>
);

const Row = ({ label, value, highlight }) => (
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: highlight?'#eff6ff':'#f8fafc', borderRadius: '8px', marginBottom: '8px' }}>
<span style={{ fontSize: '13px', fontWeight: 600, color: highlight?'#1e40af':'#475569' }}>{label}</span>
<span style={{ fontSize: '18px', fontWeight: 700, color: highlight?'#1d4ed8':'#0f172a' }}>{value}</span>
</div>
);

const tabs = [
{ icon: Home, label: '物件' },
{ icon: User, label: '収入' },
{ icon: DollarSign, label: 'ローン' },
{ icon: BarChart3, label: '結果' },
];

return (
<div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto' }}>
<style>{`* { box-sizing: border-box; margin: 0; padding: 0; } .sl { width:100%; height:5px; border-radius:8px; background:#e2e8f0; outline:none; -webkit-appearance:none; cursor:pointer; display:block; } .sl::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:#2563eb; box-shadow:0 2px 6px rgba(37,99,235,.4); } .sl::-moz-range-thumb { width:22px; height:22px; border-radius:50%; background:#2563eb; border:none; } .sl:focus { outline: 2px solid #2563eb; outline-offset: 3px; } .scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; } .scroll::-webkit-scrollbar { width: 3px; } .scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; } .tab-btn:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; } .overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:200; display:flex; align-items:flex-end; } .sheet { background:white; border-radius:16px 16px 0 0; padding:24px 20px 40px; width:100%; max-height:70vh; overflow-y:auto; }`}</style>

```
  {/* 免責事項モーダル */}
  {showDisclaimer && (
    <div className="overlay" onClick={() => setShowDisclaimer(false)} role="dialog" aria-modal="true" aria-label="免責事項">
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>免責事項</div>
        <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8, display: 'grid', gap: '12px' }}>
          <p>本シミュレーターは一般的な情報提供を目的としており、<strong>金融・税務・法律上のアドバイスを構成するものではありません。</strong></p>
          <p>計算結果は入力値をもとにした概算であり、実際のローン審査・返済額・税額とは異なる場合があります。</p>
          <p>住宅ローン控除の適用には、所得2,000万円以下・床面積40㎡以上（一定の場合50㎡以上）・返済期間10年以上などの条件があります。詳細は税務署または税理士にご確認ください。</p>
          <p>変動金利の将来予測、固定資産税評価額の算定、管理費・修繕積立金の将来推移など、不確定要素は反映されていません。</p>
          <p>本ツールの利用による損害について、開発者は責任を負いかねます。実際のローン契約・購入判断は、必ず金融機関・不動産会社・専門家にご相談ください。</p>
        </div>
        <button onClick={() => setShowDisclaimer(false)} style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
          閉じる
        </button>
      </div>
    </div>
  )}

  {/* ヘッダー */}
  <div style={{ background: 'white', padding: '12px 16px 10px', borderBottom: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>住宅ローンシミュレーター</div>
    <button onClick={() => setShowDisclaimer(true)} aria-label="免責事項を確認" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
      <Info size={14} /> 免責事項
    </button>      </div>

  <div className="scroll" style={{ flex: 1, overflowY: tab===3?'auto':'hidden', display: 'flex', flexDirection: 'column' }}>

    {/* 物件タブ */}
    {tab === 0 && (
      <div className="scroll" style={{ flex: 1, padding: '16px 16px 0', overflowY: 'auto' }}>
        <Tog options={[{v:'mansion',l:'マンション'},{v:'house',l:'戸建て'}]} value={propertyType} onChange={setPropertyType} />
        <Sl label="物件価格" value={propertyPrice} min={20000000} max={200000000} step={100000}
          onChange={v => { const snapped = Math.round(v/1000000)*1000000; setPropertyPrice(snapped); if(downPayment > snapped*0.5) setDownPayment(0); }} fmt={M} ariaLabel="物件価格" />
        <Sl label="頭金" value={downPayment} min={0} max={Math.floor(propertyPrice*0.5)} step={100000}
          onChange={v => setDownPayment(Math.round(v/500000)*500000)} fmt={v => v===0?'なし':M(v)} ariaLabel="頭金" />
        <Row label="借入額" value={M(loanAmount)} highlight />
        {propertyType === 'mansion' ? (
          <>
            <Sl label="管理費" value={managementFee} min={5000} max={50000} step={1000}
              onChange={setManagementFee} fmt={v => M(v)+'/月'} note="タワマン等は高額の場合あり" ariaLabel="管理費（月額）" />
            <Sl label="修繕積立金" value={repairReserve} min={5000} max={50000} step={1000}
              onChange={setRepairReserve} fmt={v => M(v)+'/月'} note="築年数とともに値上がりしやすい" ariaLabel="修繕積立金（月額）" />
          </>
        ) : (
          <InfoBox color="#f1f5f9" textColor="#64748b">修繕積立の目安として月2万円を自動計算済み</InfoBox>
        )}
        <div style={{ fontSize: '12px', color: '#94a3b8', paddingBottom: '8px', lineHeight: 1.8 }}>
          固定資産税：年約{M(propertyPrice*0.01)}（概算）<br/>
          <span style={{ color: '#cbd5e1' }}>新築は最大3年間50%軽減（マンションは5年）。中古の場合は実際の納税通知書でご確認ください。火災保険は年2万円で自動計算済み。</span>
        </div>
      </div>
    )}

    {/* 収入タブ */}
    {tab === 1 && (
      <div className="scroll" style={{ flex: 1, padding: '16px 16px 0', overflowY: 'auto' }}>
        <Sl label="年収（額面）" value={annualIncome} min={3000000} max={20000000} step={100000}
          onChange={v => setAnnualIncome(Math.round(v/500000)*500000)} fmt={M} ariaLabel="年収（額面）" />
        <InfoBox>
          手取り：約 <strong>{M(takeHome)}</strong>／年　（月 {M(takeHome/12)}）
        </InfoBox>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>年齢</div>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{age}<span style={{ fontSize: '13px', fontWeight: 400, color: '#94a3b8' }}>歳</span></span>
          </div>
          <input type="range" className="sl" min="20" max="65" value={age} onChange={e => setAge(Number(e.target.value))} aria-label="年齢" aria-valuetext={age+'歳'} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginTop: '3px' }}><span>20歳</span><span>65歳</span></div>
        </div>
        <Sl label="月々の生活費（住居費除く）" value={monthlyLiving} min={100000} max={500000} step={5000}
          onChange={v => setMonthlyLiving(Math.round(v/10000)*10000)} fmt={M} note="食費・光熱費・保険・教育費など" ariaLabel="月々の生活費" />
      </div>
    )}

    {/* ローンタブ */}
    {tab === 2 && (
      <div className="scroll" style={{ flex: 1, padding: '16px 16px 0', overflowY: 'auto' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>金利タイプ</div>
        <Tog options={[{v:'variable',l:'変動金利'},{v:'fixed',l:'全期間固定'}]} value={rateType}
          onChange={v => { setRateType(v); if(v==='variable') setInterestRate(0.6); else setFixedRate(1.8); }} />
        <InfoBox color={rateType==='variable'?'#fefce8':'#f0f9ff'} textColor="#475569">
          {rateType==='variable'
            ? '📊 半年ごとに見直し。現在は低金利だが将来の上昇リスクあり。'
            : '🔒 完済まで金利固定。計画が立てやすいが変動より高め。'}
        </InfoBox>
        {rateType === 'variable' ? (
          <Sl label="現在の金利" value={interestRate} min={0.1} max={3.0} step={0.05}
            onChange={setInterestRate} fmt={v => v.toFixed(2)+'%'} note="変動金利の目安：0.3〜1.0%" ariaLabel="変動金利" />
        ) : (
          <Sl label="全期間固定金利" value={fixedRate} min={1.0} max={4.0} step={0.05}
            onChange={setFixedRate} fmt={v => v.toFixed(2)+'%'} note="フラット35の目安：1.8〜2.5%" ariaLabel="全期間固定金利" />
        )}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>返済期間</div>
              <div style={{ fontSize: '12px', color: compAge > 90 ? '#ef4444' : compAge > 75 ? '#f59e0b' : '#94a3b8', marginTop: '1px', fontWeight: compAge > 90 ? 700 : 400 }}>
                完済時 {compAge}歳{compAge > 90 ? '　⚠ 現実的な返済計画を再検討してください' : compAge > 80 ? '　要検討' : ''}
              </div>
            </div>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{loanPeriod}<span style={{ fontSize: '13px', fontWeight: 400, color: '#94a3b8' }}>年</span></span>
          </div>
          <input type="range" className="sl" min="5" max="50" step="1" value={loanPeriod} onChange={e => setLoanPeriod(Number(e.target.value))} aria-label="返済期間" aria-valuetext={loanPeriod+'年'} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginTop: '3px' }}><span>5年</span><span>50年</span></div>
        </div>
        <Row label="月々のローン返済" value={M(loan.mp)} highlight />
      </div>
    )}

    {/* 結果タブ */}
    {tab === 3 && (
      <div className="scroll" style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>

        {/* ヒーローカード */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', borderRadius: '14px', padding: '20px 24px', marginBottom: '12px', color: 'white' }}>
          <div style={{ fontSize: '12px', opacity: .8, marginBottom: '2px' }}>実質月々負担</div>
          <div style={{ fontSize: '44px', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1 }}>
            {M(ana.burden)}<span style={{ fontSize: '15px', opacity: .7, fontWeight: 400 }}>/月</span>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: .75, lineHeight: 2 }}>
            ローン {M(loan.mp)} ＋
            <button onClick={() => setShowRunningDetail(p => !p)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: 'white', borderRadius: '4px', padding: '1px 6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>
              ランニング {M(monthlyRunning)} {showRunningDetail ? '▲' : '▼'}
            </button>
            　－　控除 {M(dedMonthly)}
          </div>
          {showRunningDetail && (
            <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(255,255,255,.15)', borderRadius: '8px', fontSize: '12px', lineHeight: 2 }}>
              {[
                { l: '固定資産税', v: runningDetail.tax },
                ...(propertyType === 'mansion' ? [
                  { l: '管理費', v: runningDetail.mgmt },
                  { l: '修繕積立金', v: runningDetail.repair },
                ] : [
                  { l: '修繕積立（目安）', v: runningDetail.repair },
                ]),
                { l: '火災保険', v: runningDetail.ins },
              ].map(({ l, v }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: .85 }}>{l}</span>
                  <span style={{ fontWeight: 700 }}>{M(v)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
            <div style={{ padding: '7px 10px', background: 'rgba(255,255,255,.15)', borderRadius: '8px', fontSize: '12px', lineHeight: 1.5 }}>
              ⚠ 控除は{dedYears}年間のみ。終了後は <strong>{M(loan.mp+monthlyRunning)}/月</strong>
            </div>
            {compAge > 90 && (
              <div style={{ padding: '7px 10px', background: 'rgba(239,68,68,.4)', borderRadius: '8px', fontSize: '12px', lineHeight: 1.5 }}>
                ⚠ 完済時{compAge}歳。返済期間の短縮を検討してください
              </div>
            )}
          </div>
        </div>

        {/* 金利上昇リスク（変動のみ） */}
        {rateType === 'variable' && risks && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '14px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <TrendingUp size={14} color="#f59e0b" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>金利上昇リスク試算</span>
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              {[
                { l: '現在 '+interestRate.toFixed(2)+'%', mp: loan.mp, bg:'#f0f9ff', bc:'#93c5fd', tc:'#1e40af' },
                { l: '+1% → '+(interestRate+1).toFixed(2)+'%', mp: risks[0].mp, bg:'#fffbeb', bc:'#fcd34d', tc:'#92400e' },
                { l: '+2% → '+(interestRate+2).toFixed(2)+'%', mp: risks[1].mp, bg:'#fff7ed', bc:'#fb923c', tc:'#9a3412' },
                { l: '+3% → '+(interestRate+3).toFixed(2)+'%', mp: risks[2].mp, bg:'#fef2f2', bc:'#f87171', tc:'#7f1d1d' },
              ].map(({l,mp,bg,bc,tc}) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:bg, border:`1.5px solid ${bc}`, borderRadius:'8px' }}>
                  <span style={{ fontSize:'12px', fontWeight:600, color:tc }}>{l}</span>
                  <span style={{ fontSize:'17px', fontWeight:700, color:tc }}>{M(mp)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:'8px', fontSize:'12px', color:'#94a3b8' }}>※ 概算。実際は125%ルール等が適用されます。</div>
          </div>
        )}

        {/* 妥当性診断 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '14px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
          <div style={{ padding: '12px', background: ana.all==='g'?'#f0fdf4':ana.all==='w'?'#fffbeb':'#fef2f2', borderRadius: '8px', marginBottom: '10px', textAlign: 'center', border: `2px solid ${col(ana.all)}` }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>総合判定</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: col(ana.all) }}>
              {ana.all==='g'?'◎ 適正':ana.all==='w'?'△ 要検討':'✕ 要注意'}
            </div>
          </div>
          <div style={{ display: 'grid', gap: '7px' }}>
            {[
              { l:'返済負担率', v:ana.ratio.toFixed(1)+'%', s:ana.rs, d:'年収比25%以下が目安' },
              { l:'完済時年齢', v:ana.compAge+'歳', s:ana.as, d:'80歳以下が目安' },
              { l:'生活余裕度', v:ana.sr.toFixed(1)+'%', s:ana.ss, d:'月'+M(ana.surplus)+'（20%以上が目安）' },
            ].map(({l,v,s,d}) => (
              <div key={l} style={{ padding:'10px 12px', background:'#f8fafc', borderRadius:'8px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ color:col(s) }}><SI s={s}/></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#0f172a' }}>{l}</div>
                  <div style={{ fontSize:'12px', color:'#94a3b8' }}>{d}</div>
                </div>
                <div style={{ fontSize:'16px', fontWeight:700, color:col(s) }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ランニングコスト内訳 */}
        <div style={{ background:'white', borderRadius:'12px', padding:'14px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,.07)' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'#0f172a', marginBottom:'10px' }}>月々のランニングコスト内訳</div>
          <div style={{ display:'grid', gap:'6px' }}>
            {[
              { l: '固定資産税', v: runningDetail.tax, note: '物件価格の約1%÷12（概算）。新築3年・マンション5年は50%軽減。中古は納税通知書で確認を' },
              ...(propertyType === 'mansion' ? [
                { l: '管理費', v: runningDetail.mgmt, note: '設定値' },
                { l: '修繕積立金', v: runningDetail.repair, note: '設定値（将来値上がりの可能性）' },
              ] : [
                { l: '修繕積立（目安）', v: runningDetail.repair, note: '自動計算（目安）' },
              ]),
              { l: '火災保険', v: runningDetail.ins, note: '年2万円÷12' },
            ].map(({ l, v, note }) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#f8fafc', borderRadius:'8px' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#0f172a' }}>{l}</div>
                  <div style={{ fontSize:'11px', color:'#94a3b8' }}>{note}</div>
                </div>
                <span style={{ fontSize:'16px', fontWeight:700, color:'#475569' }}>{M(v)}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#eff6ff', borderRadius:'8px', border:'1.5px solid #bfdbfe' }}>
              <span style={{ fontSize:'13px', fontWeight:700, color:'#1e40af' }}>合計</span>
              <span style={{ fontSize:'18px', fontWeight:700, color:'#1d4ed8' }}>{M(monthlyRunning)}</span>
            </div>
          </div>
        </div>

        {/* サマリーカード */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          <div style={{ background:'white', borderRadius:'12px', padding:'14px', boxShadow:'0 1px 3px rgba(0,0,0,.07)' }}>
            <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'4px' }}>総返済額</div>
            <div style={{ fontSize:'18px', fontWeight:700, color:'#0f172a' }}>{M(loan.total)}</div>
            <div style={{ fontSize:'12px', color:'#cbd5e1', marginTop:'2px' }}>利息 {M(loan.interest)}</div>
          </div>
          <div style={{ background:'white', borderRadius:'12px', padding:'14px', boxShadow:'0 1px 3px rgba(0,0,0,.07)' }}>
            <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'4px' }}>ローン控除（{dedYears}年）</div>
            <div style={{ fontSize:'18px', fontWeight:700, color:'#10b981' }}>{M(ded)}</div>
            <div style={{ fontSize:'12px', color:'#cbd5e1', marginTop:'2px' }}>実質利息 {M(loan.interest-ded)}</div>
          </div>
        </div>

        {/* ローン控除条件注記 */}
        <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#64748b', lineHeight: 1.7 }}>
          <strong>ローン控除の主な適用条件</strong><br/>
          所得2,000万円以下 ／ 床面積40㎡以上（一定条件あり） ／ 返済期間10年以上 ／ 自己居住用<br/>
          <span style={{ color: '#94a3b8' }}>詳細は税務署または税理士にご確認ください。</span>
        </div>

        {/* グラフ */}
        <div style={{ background:'white', borderRadius:'12px', padding:'14px', marginBottom:'4px', boxShadow:'0 1px 3px rgba(0,0,0,.07)' }}>
          <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'12px' }}>残高・累計利息の推移（{loanPeriod}年間）</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={loan.schedule}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" stroke="#cbd5e1" style={{ fontSize:'12px' }} tickFormatter={v => v+'年'} />
              <YAxis stroke="#cbd5e1" tickFormatter={v => Math.round(v/10000)+'万'} style={{ fontSize:'12px' }} width={40} />
              <Tooltip formatter={v => M(v)} labelFormatter={v => v+'年目'} contentStyle={{ borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'12px' }} />
              <Legend wrapperStyle={{ fontSize:'12px' }} />
              <Area type="monotone" dataKey="残高" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
              <Area type="monotone" dataKey="累計利息" stroke="#f87171" fill="#fee2e2" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    )}

    {/* ミニ結果バー（入力タブ中） */}
    {tab < 3 && (
      <div style={{ padding: '10px 16px 0', flexShrink: 0, background: '#f8fafc' }}>
        {!allInputVisited ? (
          <div style={{ background: 'white', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              残り {[0,1,2].filter(i => !visited.has(i)).length} つのタブを確認すると結果が解放されます
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { i: 0, l: '物件情報' },
                { i: 1, l: '収入・生活費' },
                { i: 2, l: 'ローン条件' },
              ].map(({ i, l }) => (
                <div key={i} style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', background: visited.has(i) ? '#f0fdf4' : '#f1f5f9', border: `1.5px solid ${visited.has(i) ? '#86efac' : '#e2e8f0'}`, textAlign: 'center', fontSize: '11px', fontWeight: 700, color: visited.has(i) ? '#16a34a' : '#94a3b8' }}>
                  {visited.has(i) ? '✓ ' : ''}{l}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.07)', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>月々の負担</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d4ed8', lineHeight: 1.1 }}>{M(ana.burden)}<span style={{ fontSize:'12px', color:'#94a3b8', fontWeight:400 }}>/月</span></div>
            </div>
            <button onClick={() => goTab(3)} style={{ padding:'8px 16px', background:'#2563eb', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
              詳細を見る →
            </button>
          </div>
        )}
      </div>
    )}

  </div>

  {/* 底部タブバー */}
  <nav aria-label="メインナビゲーション" style={{ background: 'white', borderTop: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)' }}>
    {tabs.map(({ icon: Icon, label }, i) => {
      const isResult = i === 3;
      const isActive = tab === i;
      const isDone = !isResult && visited.has(i) && tab !== i;
      const isLocked = isResult && !allInputVisited;
      const iconColor = isActive ? '#2563eb' : isLocked ? '#cbd5e1' : isDone ? '#10b981' : '#94a3b8';
      const labelColor = isActive ? '#2563eb' : isLocked ? '#cbd5e1' : isDone ? '#10b981' : '#94a3b8';
      return (
        <button
          key={i}
          className="tab-btn"
          onClick={() => !isLocked && goTab(i)}
          aria-label={isLocked ? label + '（入力完了後に解放）' : label}
          aria-current={isActive ? 'page' : undefined}
          aria-disabled={isLocked}
          style={{ flex: 1, padding: '10px 4px 8px', border: 'none', background: 'none', cursor: isLocked ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', transition: '.15s', position: 'relative' }}
        >
          <div style={{ position: 'relative' }}>
            <Icon size={22} color={iconColor} strokeWidth={isActive ? 2.5 : 1.8} />
            {isDone && (
              <div style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: '50%', background: '#10b981', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '7px', color: 'white', fontWeight: 700, lineHeight: 1 }}>✓</span>
              </div>
            )}
            {isLocked && (
              <div style={{ position: 'absolute', top: -4, right: -6, fontSize: '11px' }}>🔒</div>
            )}
          </div>
          <span style={{ fontSize: '12px', fontWeight: isActive ? 700 : 500, color: labelColor }}>{label}</span>
          {isActive && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#2563eb' }} />}
        </button>
      );
    })}
  </nav>

</div>
);
}