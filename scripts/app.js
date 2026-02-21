let discountEnabled = false;
let lastProducts = [];

const CONSTANTS = {
	DISCOUNT_PERCENT: 5, //برای تغییر تخفیف فقط همین عدد را تغییر دهید
	get DISCOUNT_FACTOR() {
    return 1 - (this.DISCOUNT_PERCENT / 100);
  },
  BASE_PRICE_FACTOR: 1.111111111111111,
  get BASE_PRICE_FACTOR_DISCOUNTED() {
    return this.BASE_PRICE_FACTOR - (this.DISCOUNT_PERCENT / 100);
  },
  PRICE_THRESHOLD: 2000000000,
  // سقف‌های جدید
  THRESHOLD_A: 5000000000,              // ۵ میلیارد
  THRESHOLD_B: 7600000000,              // ۷٫۶ میلیارد
  
  // اعتبار ثابت در حالت‌های خاص
  FIXED_CREDIT_30M_MID: 5010000000,     // برای تب ۳۰ در بازه <۵ میلیارد
  FIXED_CREDIT_36M_MID: 7610000000,     // برای تب ۳۶ در بازه <۵ و بین ۵ تا ۷٫۶
  
  INSTALLMENT_FACTORS: {
    LOW: 0.052409654285714286,
	MID: 0.044007776364,
    HIGH: 0.038436601647058824
  },
  INSTALLMENT_MONTHS: {
    LOW: 24,
	MID: 30,
    HIGH: 36
  },
  SIDE_COST_FACTORS: {
    BLOCK: 0.06061125,
    CONTRACT: 0.005158875
  },
  CONTRACT_ADDON: 2000000,
  CREDIT_ROUNDING: 100000000,
  
  // ضرایب حالت عادی
  CHEQUE_MULTIPLIERS_DEFAULT: {
    '6':  { INVOICE: 1.111111111111111, PREPAY: 0.15 },
    '12': { INVOICE: 1.166666666666667, PREPAY: 0.25 },
    // ضرایب برای Bike=1
    'bike_8':  { INVOICE: 1.072, PREPAY: 0.214400 },
    'bike_10': { INVOICE: 1.088, PREPAY: 0.217600 }
  },
  
    // ضرایب حالت رفاهی — بدون تخفیف
  WELFARE_MULTIPLIERS_DEFAULT: {
    '24': 1.3,      // 24 ماهه
    '30': 1.3624    // 30 ماهه
  },

  GUARANTEE_FACTOR: 0.25,
  FIXED_CREDIT_36M: 2100000000,
  BIKE_CASH_PRICE_THRESHOLD: 100000000
};

function buildChequeMultipliersDiscounted(defaultMultipliers, discountFactor) {
  const discountDelta = 1 - discountFactor;
  const discountPercent = discountDelta * 100;
  const result = {};
  
  for (const [key, values] of Object.entries(defaultMultipliers)) {
    const discountedInvoice = values.INVOICE - discountDelta;
    
    const month = key.startsWith('bike_') 
      ? parseInt(key.replace('bike_', ''), 10) 
      : parseInt(key, 10);
    
    const defaultPrepay = values.PREPAY;
    
    const baseReductionRate = 0.0035;
    const monthlyIncreaseRate = 0.0002;
    
    const monthsFromEight = month - 8;
    const reductionRate = baseReductionRate + (monthsFromEight * monthlyIncreaseRate);
    const totalReduction = discountPercent * reductionRate;
    
    let discountedPrepay = defaultPrepay - totalReduction;
    
    const minPrepay = key.startsWith('bike_') ? 0.18 : 0.20;
    discountedPrepay = Math.max(discountedPrepay, minPrepay);
    
    result[key] = {
      INVOICE: Number(discountedInvoice.toFixed(3)),
      PREPAY: Number(discountedPrepay.toFixed(6))
    };
  }
  
  return result;
}

function getWelfareMultipliers() {
  const discountFactor = CONSTANTS.DISCOUNT_FACTOR;
  const discountDelta = 1 - discountFactor;
  const result = {};
  for (const [months, multiplier] of Object.entries(CONSTANTS.WELFARE_MULTIPLIERS_DEFAULT)) {
    result[months] = Number((multiplier - discountDelta).toFixed(4));
  }
  return result;
}

function getChequeMultipliersDiscounted() {
  return buildChequeMultipliersDiscounted(
    CONSTANTS.CHEQUE_MULTIPLIERS_DEFAULT,
    CONSTANTS.DISCOUNT_FACTOR
  );
}


console.log('DEFAULT CHEQUE_MULTIPLIERS:');
Object.entries(CONSTANTS.CHEQUE_MULTIPLIERS_DEFAULT).forEach(([key, value]) => {
  console.log(`  Key: ${key}, INVOICE: ${value.INVOICE}, PREPAY: ${value.PREPAY}`);
});

console.log('DISCOUNTED CHEQUE_MULTIPLIERS:');
const discountedMultipliers = getChequeMultipliersDiscounted();
Object.entries(discountedMultipliers).forEach(([key, value]) => {
  console.log(`  Key: ${key}, INVOICE: ${value.INVOICE}, PREPAY: ${value.PREPAY}`);
});

console.log('ضرایب رفاهی حالت عادی:');
Object.entries(CONSTANTS.WELFARE_MULTIPLIERS_DEFAULT).forEach(([key, value]) => {
  console.log(`  ${key} ماهه: ${value}`);
});

console.log('ضرایب رفاهی حالت تخفیف‌دار:');
Object.entries(getWelfareMultipliers()).forEach(([key, value]) => {
  console.log(`  ${key} ماهه: ${value}`);
});


function getChequeMultipliers() {
  return discountEnabled
    ? getChequeMultipliersDiscounted()
    : CONSTANTS.CHEQUE_MULTIPLIERS_DEFAULT;
}

const CHEQUE_MULTIPLIERS = new Proxy({}, {
  get(target, prop) {
    const active = getChequeMultipliers();
    return active[prop];
  }
});


const WELFARE_MULTIPLIERS = new Proxy({}, {
  get(target, prop) {
    const multipliers = getWelfareMultipliers();
    return multipliers[prop];
  }
});

function getBasePriceFactor() {
  return discountEnabled 
    ? CONSTANTS.BASE_PRICE_FACTOR_DISCOUNTED  // حالا getter است
    : CONSTANTS.BASE_PRICE_FACTOR;
}

function setDiscountPercent(percent) {
  CONSTANTS.DISCOUNT_PERCENT = percent;
  discountEnabled = percent > 0;
  
  console.log(`🔄 تخفیف به ${percent}% تغییر کرد`);
  console.log(`   DISCOUNT_FACTOR: ${CONSTANTS.DISCOUNT_FACTOR}`);
  console.log(`   BASE_PRICE_FACTOR_DISCOUNTED: ${CONSTANTS.BASE_PRICE_FACTOR_DISCOUNTED}`);
  
  // رندر مجدد
  if (typeof renderProducts === 'function' && lastProducts) {
    renderProducts(lastProducts);
  }
}

const grid = document.getElementById('grid');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');


(function insertDiscountControl(){
  const html = `
    <div id="discountControl" class="mb-4 mt-4 px-2 text-sm">
      <label class="inline-flex items-center cursor-pointer">
        <input id="enableDiscount" type="checkbox" class="sr-only" />
        <span id="enableDiscountSwitch" class="w-11 h-6 bg-gray-200 rounded-full relative ml-2 transition-colors" style="display:inline-block;vertical-align:middle"></span>
        فعالسازی تخفیف (${CONSTANTS.DISCOUNT_PERCENT}%)
      </label>
    </div>`;
  try{
    if(grid && grid.parentNode){
      grid.insertAdjacentHTML('beforebegin', html);
    } else {
      document.body.insertAdjacentHTML('afterbegin', html);
    }
    const cb = document.getElementById('enableDiscount');
    const sw = document.getElementById('enableDiscountSwitch');
    function updateSwitchAppearance(checked){
      if(!sw) return;
      if(checked){
        sw.style.backgroundColor = '#4f46e5';
        sw.innerHTML = '<span style="position:absolute;right:3px;top:50%;transform:translateY(-50%);width:18px;height:18px;background:white;border-radius:50%"></span>';
      } else {
        sw.style.backgroundColor = '#cfcfcfff';
        sw.innerHTML = '<span style="position:absolute;left:3px;top:50%;transform:translateY(-50%);width:18px;height:18px;background:white;border-radius:50%"></span>';
      }
    }
    if(cb){
      updateSwitchAppearance(cb.checked);
      cb.addEventListener('change', ()=>{
        discountEnabled = !!cb.checked;
        updateSwitchAppearance(cb.checked);
        renderProducts(lastProducts || []);
      });
    }
  }catch(e){}
  

})();

function showModal(html){
  modalContent.innerHTML = html;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
function hideModal(){
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
closeModal.addEventListener('click', hideModal);
modal.addEventListener('click', (e)=>{ if(e.target===modal) hideModal(); });

function parseCSV(text){
  const lines = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    const nxt = text[i+1];
    if(ch==='"'){
      if(inQuotes && nxt==='"'){ cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if(ch==='\n' && !inQuotes){
      row.push(cur.replace(/\r$/, ''));
      lines.push(row);
      row = [];
      cur = '';
      continue;
    }
    if(ch===',' && !inQuotes){ row.push(cur); cur=''; continue; }
    cur += ch;
  }
  if(cur.length || row.length) { row.push(cur.replace(/\r$/, '')); lines.push(row); }
  return lines;
}

function arrayToObjects(arr){
  const [head, ...rows] = arr;
  if(!head) return [];
  return rows.map(r=>{
    const obj = {};
    for(let i=0;i<head.length;i++) obj[head[i].trim()] = (r[i]||'').trim();
    return obj;
  });
}

function escapeHtml(s){
  return (s||'').toString().replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c]));
}

function fmtNumber(n, decimals=0){
  const num = parseFloat(n);
  if(!isFinite(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function roundUpToMillion(n){
  if(!isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / 1000000) * 1000000;
}

function getInstallmentDetails(price){
  const months = (price > CONSTANTS.PRICE_THRESHOLD) ? CONSTANTS.INSTALLMENT_MONTHS.HIGH : CONSTANTS.INSTALLMENT_MONTHS.LOW;
  const factor = (price > CONSTANTS.PRICE_THRESHOLD) ? CONSTANTS.INSTALLMENT_FACTORS.HIGH : CONSTANTS.INSTALLMENT_FACTORS.LOW;
  const raw = price * factor;
  const rounded = roundUpToMillion(raw);
  return { months, factor, raw, rounded };
}

function getCreditRules(basePrice) {
  const rounded = Math.ceil(basePrice / CONSTANTS.CREDIT_ROUNDING) * CONSTANTS.CREDIT_ROUNDING;

  if (basePrice <= CONSTANTS.THRESHOLD_A) {
    // حالت ۱: زیر ۵ میلیارد
    return {
      showTab24: true,
      showTab30: true,
      showTab36: true,
      credit24: rounded,
      credit30: CONSTANTS.FIXED_CREDIT_30M_MID,
      credit36: CONSTANTS.FIXED_CREDIT_36M_MID
    };
  } 
  else if (basePrice <= CONSTANTS.THRESHOLD_B) {
    // حالت ۲: ۵ تا ۷٫۶ میلیارد
    return {
      showTab24: false,
      showTab30: true,
      showTab36: true,
      credit24: 0,                    // مهم نیست چون مخفی میشه
      credit30: rounded,
      credit36: CONSTANTS.FIXED_CREDIT_36M_MID
    };
  } 
  else {
    // حالت ۳: بالای ۷٫۶ میلیارد
    return {
      showTab24: false,
      showTab30: false,
      showTab36: true,
      credit24: 0,
      credit30: 0,
      credit36: rounded
    };
  }
}

function buildModalHtml(title, price, showPrice = true, forceTabs = false, code = null, rawPrice = null, originalPrice = null, isBike = false, includeExtraTabs = true){
  const details = getInstallmentDetails(price);
  const months = details.months;
  const installmentRounded = details.rounded;
  const installmentExact = details.raw;

  const creditPrice = Math.ceil(price / CONSTANTS.CREDIT_ROUNDING) * CONSTANTS.CREDIT_ROUNDING;
  const creditRow = `<div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">میزان اعتبار</div><div class="font-medium text-gray-800">${fmtNumber(creditPrice,0)} ریال</div></div>`;

  const sideRaw = (creditPrice / 1000000000) * 75000000;
  const sideWithAdd = sideRaw + CONSTANTS.CONTRACT_ADDON;
  const sideRounded = roundUpToMillion(sideWithAdd);
  const sideRow = `<div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">بلوکه + قرارداد</div><div class="font-medium text-gray-800">${fmtNumber(sideRounded,0)} ریال</div></div>`;

  let cashPriceRow = '';
  let originalPriceRow = '';
  if(showPrice){
    cashPriceRow = `<div class="flex justify-between py-2"><div class="text-sm text-gray-600">قیمت نقدی محصول</div><div class="font-semibold text-gray-800 text-lg">${fmtNumber(price,0)} ریال</div></div>`;
  }
  if(discountEnabled && originalPrice !== null && originalPrice !== undefined && originalPrice !== price){
    originalPriceRow = `<div class="flex justify-between py-2 border-t"><div class="text-sm text-gray-600">قیمت بدون تخفیف</div><div class="font-medium text-gray-800">${fmtNumber(originalPrice,0)} ریال</div></div>`;
  } else {
    originalPriceRow = '';
  }

  // نمایش کد + قیمت خام (در صورت وجود)
  const codeAndRawPrice = (code && rawPrice) ? `
    <div class="flex justify-between text-sm text-gray-600 mb-2">
      <div>${escapeHtml(code)}</div>
      <div class="font-mono">${fmtNumber(rawPrice, 0)}</div>
    </div>
  ` : (code ? `<div class="text-sm text-gray-600 mb-2">${escapeHtml(code)}</div>` : '');

  if(isBike){
    const show10Months = price >= CONSTANTS.BIKE_CASH_PRICE_THRESHOLD;
    const chequeContentHtml = `
  <div id="tabChequeContent" class="mt-4">
    <div class="mb-3">
      <label class="text-sm text-gray-700 block mb-1">نحوه خرید</label>
      <select id="chequeMode" class="w-full border px-2 py-1 rounded">
        <option value="bike_8" selected>8 ماهه</option>
        ${show10Months ? '<option value="bike_10">10 ماهه</option>' : ''}
      </select>
    </div>
    <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ فاکتور</div><div id="chequeInvoice" class="font-medium text-gray-800">-</div></div>
    
    <!-- بخش جدید: اسلایدر تنظیم پیش‌پرداخت -->
    <div class="py-3">
  <div class="flex justify-between items-center mb-2">
    <div class="text-sm text-gray-600">پیش پرداخت</div>
    <div class="font-medium text-gray-800" id="chequePrepayAmount">-</div>
  </div>
  <input type="range" id="chequePrepaySlider" class="generator-input w-full" min="0" max="100" step="0.5" value="0">
</div>
    
    <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div id="chequeInstallment" class="font-medium text-gray-800">-</div></div>
    <div class="flex justify-between py-2"><div class="text-sm text-gray-600">مبلغ چک ضمانت</div><div id="chequeGuarantee" class="font-medium text-gray-800">-</div></div>
    ${discountEnabled ? `<div class="flex justify-between py-2 border-t"><div class="text-sm text-gray-600">قیمت بدون تخفیف</div><div id="chequeOriginalPrice" class="font-medium text-gray-800">-</div></div>` : ''}
  </div>
`;
    return `<div class="text-2xl font-semibold mb-1 text-gray-900">${escapeHtml(title)}</div>${codeAndRawPrice}${chequeContentHtml}`;
  }

  const mainRows = `
    <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">تعداد اقساط</div><div class="font-medium text-gray-800">${months} ماه</div></div>
    <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div class="font-medium text-gray-800">${fmtNumber(installmentExact,0)} ریال</div></div>
  ${creditRow}
  ${sideRow}
  ${cashPriceRow}
  ${originalPriceRow}`;

  // ────────────────────────────────────────────────
const rules = getCreditRules(price);   // ← مهم

// اگر هیچ تبی نمایش داده نشود → فقط قیمت نقدی نشان بده
if (!rules.showTab24 && !rules.showTab30 && !rules.showTab36) {
  // فقط ردیف قیمت نقدی و قیمت بدون تخفیف (اگر هست)
  return `
    <div class="text-2xl font-semibold mb-1 text-gray-900">${escapeHtml(title)}</div>
    ${codeAndRawPrice}
    <div class="flex justify-between py-2">
      <div class="text-sm text-gray-600">قیمت نقدی محصول</div>
      <div class="font-semibold text-gray-800 text-lg">${fmtNumber(price,0)} ریال</div>
    </div>
    ${discountEnabled && originalPrice ? originalPriceRow : ''}
  `;
}

// در غیر این صورت تب‌ها رو می‌سازیم
let tabButtons = '';
let tabContents = '';

// تب ۲۴
if (rules.showTab24) {
  const side24 = roundUpToMillion(((rules.credit24 / 1000000000)* 75000000)) + CONSTANTS.CONTRACT_ADDON;
  tabButtons += `<button id="tab24" class="px-3 py-2 bg-indigo-600 text-white rounded">24 ماه</button>`;
  tabContents += `
    <div id="tab24Content">
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div class="font-medium text-gray-800">${fmtNumber(price * CONSTANTS.INSTALLMENT_FACTORS.LOW,0)} ریال</div></div>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">میزان اعتبار</div><div class="font-medium text-gray-800">${fmtNumber(rules.credit24,0)} ریال</div></div>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">بلوکه + قرارداد</div><div class="font-medium text-gray-800">${fmtNumber(side24,0)} ریال</div></div>
      ${cashPriceRow}
      ${discountEnabled ? originalPriceRow : ''}
    </div>
  `;
}

// تب ۳۰
if (rules.showTab30) {
  const side30 = roundUpToMillion(((rules.credit30 / 1000000000)* 75000000)) + CONSTANTS.CONTRACT_ADDON;
  tabButtons += `<button id="tab30" class="px-3 py-2 ${rules.showTab24 ? 'bg-white text-gray-700 border' : 'bg-indigo-600 text-white'} rounded">30 ماه</button>`;
  tabContents += `
    <div id="tab30Content" ${rules.showTab24 ? 'class="hidden"' : ''}>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div class="font-medium text-gray-800">${fmtNumber(price * CONSTANTS.INSTALLMENT_FACTORS.MID,0)} ریال</div></div>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">میزان اعتبار</div><div class="font-medium text-gray-800">${fmtNumber(rules.credit30,0)} ریال</div></div>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">بلوکه + قرارداد</div><div class="font-medium text-gray-800">${fmtNumber(side30,0)} ریال</div></div>
      ${cashPriceRow}
      ${discountEnabled ? originalPriceRow : ''}
    </div>
  `;
}

// تب ۳۶
if (rules.showTab36) {
  const side36 = roundUpToMillion(((rules.credit36 / 1000000000)* 75000000)) + CONSTANTS.CONTRACT_ADDON;
  tabButtons += `<button id="tab36" class="px-3 py-2 ${!rules.showTab24 && !rules.showTab30 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'} rounded">36 ماه</button>`;
  tabContents += `
    <div id="tab36Content" class="${rules.showTab24 || rules.showTab30 ? 'hidden' : ''}">
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div class="font-medium text-gray-800">${fmtNumber(price * CONSTANTS.INSTALLMENT_FACTORS.HIGH,0)} ریال</div></div>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">میزان اعتبار</div><div class="font-medium text-gray-800">${fmtNumber(rules.credit36,0)} ریال</div></div>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">بلوکه + قرارداد</div><div class="font-medium text-gray-800">${fmtNumber(side36,0)} ریال</div></div>
      ${cashPriceRow}
      ${discountEnabled ? originalPriceRow : ''}
    </div>
  `;
}

// تب‌های چکی و رفاهی فقط وقتی includeExtraTabs=true نمایش داده شوند
let extraButtons = '';
let extraContents = '';

if (includeExtraTabs) {
  extraButtons = `
    <button id="tabCheque" class="px-3 py-2 bg-white text-gray-700 rounded border">چکی</button>
    <button id="tabWelfare" class="px-3 py-2 bg-white text-gray-700 rounded border">رفاهی</button>
  `;
  extraContents = `
    <div id="tabChequeContent" class="hidden mt-4">
	<div class="mb-3">
    <label class="text-sm text-gray-700 block mb-1">نحوه خرید</label>
    <select id="chequeMode" class="w-full border px-2 py-1 rounded">
      <option value="6" selected>6 ماهه</option>
      <option value="12">12 ماهه</option>
    </select>
  </div>
  <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ فاکتور</div><div id="chequeInvoice" class="font-semibold text-gray-800">-</div></div>
  
  <!-- بخش جدید: اسلایدر تنظیم پیش‌پرداخت -->
  <div class="py-3">
  <div class="flex justify-between items-center mb-2">
    <div class="text-sm text-gray-600">پیش پرداخت</div>
    <div class="font-medium text-gray-800" id="chequePrepayAmount">-</div>
  </div>
  <input type="range" id="chequePrepaySlider" class="generator-input w-full" min="0" max="100" step="0.5" value="0">
</div>
  
  <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div id="chequeInstallment" class="font-medium text-gray-800">-</div></div>
  <div class="flex justify-between py-2"><div class="text-sm text-gray-600">مبلغ چک ضمانت</div><div id="chequeGuarantee" class="font-medium text-gray-800">-</div></div>
  ${discountEnabled ? `<div class="flex justify-between py-2 border-t"><div class="text-sm text-gray-600">قیمت بدون تخفیف</div><div id="chequeOriginalPrice" class="font-medium text-gray-800">-</div></div>` : ''}
</div>
	</div>
    <div id="tabWelfareContent" class="hidden mt-4">
	<div class="mb-3">
          <label class="text-sm text-gray-700 block mb-1">نحوه خرید رفاهی</label>
          <select id="welfareMode" class="w-full border px-2 py-1 rounded">
            <option value="24">24 ماهه</option>
            <option value="30" selected>30 ماهه</option>
          </select>
        </div>
        <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ فاکتور</div><div id="welfareInvoice" class="font-medium text-gray-800">-</div></div>
        <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div id="welfareInstallment" class="font-medium text-gray-800">-</div></div>
        <div class="flex justify-between py-2"><div class="text-sm text-gray-600">مبلغ چک ضمانت</div><div id="welfareGuarantee" class="font-medium text-gray-800">-</div></div>
        ${discountEnabled ? `<div class="flex justify-between py-2 border-t"><div class="text-sm text-gray-600">قیمت بدون تخفیف</div><div id="welfareOriginalPrice" class="font-medium text-gray-800">-</div></div>` : ''}
      </div>
  </div>
	</div>
  `;
}



const tabHtml = `
  <div class="flex gap-2 mb-4 flex-wrap">
    ${tabButtons}
    ${extraButtons}
  </div>
  ${tabContents}
  ${extraContents}
`;

return `<div class="text-2xl font-semibold mb-1 text-gray-900">${escapeHtml(title)}</div>${codeAndRawPrice}${tabHtml}`;

  let extraRows = '';
  if(price <= CONSTANTS.PRICE_THRESHOLD){
    const v36 = price * CONSTANTS.INSTALLMENT_FACTORS.HIGH;
    extraRows = `<div class="flex justify-between py-2"><div class="text-base font-semibold text-sm text-gray-600">اقساط 36 ماهه</div><div class="text-base font-semibold text-gray-800 ">${fmtNumber(v36,0)} ریال</div></div>`;
  }

  const chequeButtonHtml = rawPrice ? `<div class="flex gap-2 mb-4"><button id="tab36Single" class="px-3 py-2 bg-indigo-600 text-white rounded border">36 ماه</button><button id="tabCheque" class="px-3 py-2 bg-white text-gray-700 rounded border">چکی</button><button id="tabWelfare" class="px-3 py-2 bg-white text-gray-700 rounded border">رفاهی</button></div>` : '';
  const chequeContentHtml = rawPrice ? `
    <div id="tabChequeContent" class="hidden mt-4">
  <div class="mb-3">
    <label class="text-sm text-gray-700 block mb-1">نحوه خرید</label>
    <select id="chequeMode" class="w-full border px-2 py-1 rounded">
      <option value="6" selected>6 ماهه</option>
      <option value="12">12 ماهه</option>
    </select>
  </div>
  <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ فاکتور</div><div id="chequeInvoice" class="font-semibold text-gray-800">-</div></div>
  
  <!-- بخش جدید: اسلایدر تنظیم پیش‌پرداخت -->
  <div class="py-3">
  <div class="flex justify-between items-center mb-2">
    <div class="text-sm text-gray-600">پیش پرداخت</div>
    <div class="font-medium text-gray-800" id="chequePrepayAmount">-</div>
  </div>
  <input type="range" id="chequePrepaySlider" class="generator-input w-full" min="0" max="100" step="0.5" value="0">
</div>
  
  <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div id="chequeInstallment" class="font-medium text-gray-800">-</div></div>
  <div class="flex justify-between py-2"><div class="text-sm text-gray-600">مبلغ چک ضمانت</div><div id="chequeGuarantee" class="font-medium text-gray-800">-</div></div>
  ${discountEnabled ? `<div class="flex justify-between py-2 border-t"><div class="text-sm text-gray-600">قیمت بدون تخفیف</div><div id="chequeOriginalPrice" class="font-medium text-gray-800">-</div></div>` : ''}
</div>
  ` : '';

 const welfareContentHtml = rawPrice ? `
    <div id="tabWelfareContent" class="hidden mt-4">
      <div class="mb-3">
        <label class="text-sm text-gray-700 block mb-1">نحوه خرید رفاهی</label>
        <select id="welfareMode" class="w-full border px-2 py-1 rounded">
          <option value="24">24 ماهه</option>
          <option value="30" selected>30 ماهه</option>
        </select>
      </div>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ فاکتور</div><div id="welfareInvoice" class="font-medium text-gray-800">-</div></div>
      <div class="flex justify-between border-b py-2"><div class="text-sm text-gray-600">مبلغ هر قسط</div><div id="welfareInstallment" class="font-medium text-gray-800">-</div></div>
      <div class="flex justify-between py-2"><div class="text-sm text-gray-600">مبلغ چک ضمانت</div><div id="welfareGuarantee" class="font-medium text-gray-800">-</div></div>
      ${discountEnabled ? `<div class="flex justify-between py-2 border-t"><div class="text-sm text-gray-600">قیمت بدون تخفیف</div><div id="welfareOriginalPrice" class="font-medium text-gray-800">-</div></div>` : ''}
    </div>
  ` : '';

  const mainWrapper = `<div id="mainRowsContent">${mainRows}${extraRows}</div>`;
  return `<div class="text-2xl font-semibold mb-1 text-gray-900">${escapeHtml(title)}</div>${codeAndRawPrice}${chequeButtonHtml}${chequeContentHtml}${welfareContentHtml}${mainWrapper}`;
}

function renderProducts(products){
  grid.innerHTML = '';
  lastProducts = products;
  if(!products.length){ 
    grid.innerHTML = '<p class="text-center text-gray-400 py-12">هیچ محصولی موجود نیست.</p>';
    return; }
  const existingCodes = new Set();
  products.forEach(row=>{
    const ev = (row.Exist || row.exist || row['Exist'] || row['exist'] || row['EXIST'] || '').toString().trim();
    if(!ev) return;
    const toks = ev.split(/[,;|\s]+/).map(t=>t.trim()).filter(Boolean);
    toks.forEach(t=>{
      const low = t.toString().trim();
      if(!low) return;
      const ll = low.toLowerCase();
      if(['1','0','true','false','yes','no'].includes(ll)) return;
      existingCodes.add(low);
      existingCodes.add(ll);
    });
  });

  products.forEach((p, idx)=>{
    const name = p.Name || p.name || p.Title || p.title || p['نام'] || Object.values(p)[0] || 'نام نامشخص';
    const card = document.createElement('button');
    const codeInRow = (p.Code || p.code || p['Code'] || p['code'] || '').toString().trim();
    let isExist = false;
    if(codeInRow){
      const low = codeInRow.toString().trim();
      isExist = existingCodes.has(low) || existingCodes.has(low.toLowerCase()) || existingCodes.has(low.toUpperCase());
    }
    if(!isExist){
      const existVal = (p.Exist || p.exist || p['Exist'] || p['exist'] || p['EXIST'] || '').toString().trim().toLowerCase();
      if(['1','true','yes','y'].includes(existVal)) isExist = true;
    }
    card.className = isExist
      ? 'text-left py-6 rounded-2xl shadow-md bg-green-100 hover:scale-105 transition transform border border-gray-200'
      : 'text-left py-6 rounded-2xl shadow-md bg-gradient-to-br from-white to-gray-50 hover:scale-105 transition transform border border-gray-200';
    try{ card.dataset.name = (name||'').toString().toLowerCase(); }catch(e){}
    card.innerHTML = `
      <div class="text-center">
        <div class="text-base text-gray-900">${escapeHtml(name)}</div>
      </div>`;
    card.addEventListener('click', ()=>{
      const rawPriceStr = (p.Price || p.price || '').toString();
      const cleaned = rawPriceStr.replace(/[,\s]/g, '').replace(/[^0-9.\-]/g, '');
      const numericPrice = parseFloat(cleaned) || 0;
      const priceToUse = numericPrice;
      const basePrice = priceToUse * getBasePriceFactor();
      const originalBasePrice = discountEnabled ? numericPrice * CONSTANTS.BASE_PRICE_FACTOR : null;
      const codeVal = (p.Code || p.code || p['Code'] || p['code'] || '').toString().trim();
      const rawPriceVal = numericPrice;
      const isBike = (p.Bike || p.bike || p['Bike'] || p['bike'] || '').toString().trim() === '1';
      const useTabs = !isBike && basePrice <= CONSTANTS.PRICE_THRESHOLD;
      showModal(buildModalHtml(name, basePrice, true, useTabs, codeVal, rawPriceVal, originalBasePrice, isBike, true));

setTimeout(()=>{
  // دریافت المان‌های مورد نیاز
  const chequeMode = document.getElementById('chequeMode');
  const invoiceEl = document.getElementById('chequeInvoice');
  const instEl = document.getElementById('chequeInstallment');
  const guaranteeEl = document.getElementById('chequeGuarantee');
  const chequeOriginalEl = document.getElementById('chequeOriginalPrice');
  const welfareMode = document.getElementById('welfareMode');
  
  // ذخیره rawPriceVal برای استفاده در توابع داخلی
  const productRawPrice = rawPriceVal;

  // ========== تعریف توابع محاسباتی ==========
  
  // تابع محاسبات چکی
// تابع محاسبات چکی
const computeChequeFn = function() {
  // دریافت مجدد المان‌ها (مهم برای bike)
  const chequeMode = document.getElementById('chequeMode');
  const invoiceEl = document.getElementById('chequeInvoice');
  const instEl = document.getElementById('chequeInstallment');
  const guaranteeEl = document.getElementById('chequeGuarantee');
  const chequeOriginalEl = document.getElementById('chequeOriginalPrice');
  
  // بررسی وجود المان‌های مورد نیاز
  if (!chequeMode || !invoiceEl || !instEl) {
    console.log('المان‌های چکی پیدا نشد');
    return;
  }
  
  const mode = chequeMode.value;
  
  // بررسی وجود ضریب برای این mode
  let invoiceMultiplier;
  let prepayMultiplier;
  
  // برای bike، modeها با 'bike_' شروع می‌شوند
  if (mode.startsWith('bike_')) {
    invoiceMultiplier = CHEQUE_MULTIPLIERS[mode]?.INVOICE || getBasePriceFactor();
    prepayMultiplier = CHEQUE_MULTIPLIERS[mode]?.PREPAY || 0.2144;
  } else {
    invoiceMultiplier = CHEQUE_MULTIPLIERS[mode]?.INVOICE || getBasePriceFactor();
    prepayMultiplier = CHEQUE_MULTIPLIERS[mode]?.PREPAY || CHEQUE_MULTIPLIERS.PREPAY;
  }
  
  const srcRaw = productRawPrice;
  const invoice = srcRaw * invoiceMultiplier;
  
  // محاسبه حداقل پیش‌پرداخت براساس ضریب
  const minPrepay = invoice * prepayMultiplier;
  
  // دریافت المان‌های اسلایدر
  const prepaySlider = document.getElementById('chequePrepaySlider');
  const prepayAmount = document.getElementById('chequePrepayAmount');
  
  // برای bike، اگر اسلایدر وجود نداشت، از روش ساده استفاده کن
  if (!prepaySlider || !prepayAmount) {
    // روش ساده برای bike
    const prepayBase = invoice * prepayMultiplier;
    const months = parseInt(mode.replace('bike_', ''), 10);
    let installmentRaw = (invoice - prepayBase) / months;
    
    function roundSpecial(n){
      const abs = Math.abs(Math.floor(n));
      const s = abs.toString();
      const len = s.length;
      if(len === 7){
        const prefix = s.slice(0,2);
        const rounded = parseInt(prefix + '0'.repeat(5), 10);
        return Math.sign(n) * rounded;
      }
      if(len === 8){
        const prefix = s.slice(0,2);
        const rounded = parseInt(prefix + '0'.repeat(6), 10);
        return Math.sign(n) * rounded;
      }
      if(len === 9){
        const prefix = s.slice(0,3);
        const rounded = parseInt(prefix + '0'.repeat(6), 10);
        return Math.sign(n) * rounded;
      }
      if(len === 10){
        const prefix = s.slice(0,3);
        const rounded = parseInt(prefix + '0'.repeat(7), 10);
        return Math.sign(n) * rounded;
      }
      return Math.round(n);
    }
    
    const installmentRounded = roundSpecial(installmentRaw);
    const totalRounded = installmentRounded * months;
    const diff = invoice - (prepayBase + totalRounded);
    const prepayAdjusted = prepayBase + diff;
    
    let guaranteeRaw = installmentRounded * months;
    guaranteeRaw = guaranteeRaw + (guaranteeRaw * CONSTANTS.GUARANTEE_FACTOR);
    const guaranteeRounded = Math.ceil(guaranteeRaw);
    
    invoiceEl.textContent = fmtNumber(invoice, 0) + ' ریال';
    instEl.textContent = fmtNumber(installmentRounded, 0) + ' ریال';
    
    // برای bike، المان prepayAmount ممکن است وجود نداشته باشد
    const prepayAmountElem = document.getElementById('chequePrepayAmount');
    if (prepayAmountElem) {
      prepayAmountElem.textContent = fmtNumber(prepayAdjusted, 0) + ' ریال';
    }
    
    if (guaranteeEl) {
      guaranteeEl.textContent = fmtNumber(guaranteeRounded, 0) + ' ریال';
    }
    
    if (chequeOriginalEl) {
      const originalRaw = (productRawPrice || 0) * (CONSTANTS.CHEQUE_MULTIPLIERS_DEFAULT[mode]?.INVOICE || CONSTANTS.BASE_PRICE_FACTOR);
      chequeOriginalEl.textContent = fmtNumber(originalRaw, 0) + ' ریال';
    }
    return;
  }
  
  // ادامه کد برای زمانی که اسلایدر وجود دارد (محصولات عادی)
  const months = parseInt(mode.replace('bike_', ''), 10);
  
  // تابع تبدیل درصد به مبلغ
  function percentToAmount(percent) {
    return minPrepay + (percent / 100) * (invoice - minPrepay);
  }
  
  // تابع تبدیل مبلغ به درصد
  function amountToPercent(amount) {
    amount = Math.max(minPrepay, Math.min(invoice, amount));
    return ((amount - minPrepay) / (invoice - minPrepay)) * 100;
  }
  
  // تنظیم محدوده اسلایدر (بر اساس درصد)
  prepaySlider.min = 0;
  prepaySlider.max = 100;
  prepaySlider.value = 0;
  prepayAmount.textContent = fmtNumber(minPrepay, 0) + ' ریال';
  
  // تابع به‌روزرسانی مقادیر براساس پیش‌پرداخت
  function updateFromPrepay(prepayValue) {
    prepayValue = Math.max(minPrepay, Math.min(invoice, prepayValue));
    let installmentRaw = (invoice - prepayValue) / months;
    
    function roundSpecial(n){
      const abs = Math.abs(Math.floor(n));
      const s = abs.toString();
      const len = s.length;
      if(len === 7){
        const prefix = s.slice(0,2);
        return Math.sign(n) * parseInt(prefix + '0'.repeat(5), 10);
      }
      if(len === 8){
        const prefix = s.slice(0,2);
        return Math.sign(n) * parseInt(prefix + '0'.repeat(6), 10);
      }
      if(len === 9){
        const prefix = s.slice(0,3);
        return Math.sign(n) * parseInt(prefix + '0'.repeat(6), 10);
      }
      if(len === 10){
        const prefix = s.slice(0,3);
        return Math.sign(n) * parseInt(prefix + '0'.repeat(7), 10);
      }
      return Math.round(n);
    }
    
    const installmentRounded = roundSpecial(installmentRaw);
    const totalRounded = installmentRounded * months;
    const adjustedPrepay = invoice - totalRounded;
    
    let guaranteeRaw = installmentRounded * months;
    guaranteeRaw = guaranteeRaw + (guaranteeRaw * CONSTANTS.GUARANTEE_FACTOR);
    const guaranteeRounded = Math.ceil(guaranteeRaw);
    
    invoiceEl.textContent = fmtNumber(invoice, 0) + ' ریال';
    prepayAmount.textContent = fmtNumber(adjustedPrepay, 0) + ' ریال';
    prepaySlider.value = amountToPercent(adjustedPrepay);
    instEl.textContent = fmtNumber(installmentRounded, 0) + ' ریال';
    
    if (guaranteeEl) {
      guaranteeEl.textContent = fmtNumber(guaranteeRounded, 0) + ' ریال';
    }
    
    if (chequeOriginalEl) {
      const originalRaw = (productRawPrice || 0) * (CONSTANTS.CHEQUE_MULTIPLIERS_DEFAULT[mode.replace('bike_', '')]?.INVOICE || CONSTANTS.CHEQUE_MULTIPLIERS_DEFAULT[mode]?.INVOICE || CONSTANTS.BASE_PRICE_FACTOR);
      chequeOriginalEl.textContent = fmtNumber(originalRaw, 0) + ' ریال';
    }
  }
  
  // حذف رویدادهای قبلی
  const newPrepaySlider = prepaySlider.cloneNode(false);
  prepaySlider.parentNode.replaceChild(newPrepaySlider, prepaySlider);
  
  newPrepaySlider.addEventListener('input', function() {
    const percent = parseFloat(this.value);
    const amount = percentToAmount(percent);
    updateFromPrepay(amount);
  });
  
  updateFromPrepay(minPrepay);
};

setTimeout(computeChequeFn, 100);

  // تابع محاسبات رفاهی
  const computeWelfareFn = function() {
    if (!welfareMode) return;
    
    const mode = welfareMode.value;
    if(!mode) return;

    const invoiceMultiplier = WELFARE_MULTIPLIERS[mode];
    const srcRaw = productRawPrice;
    const invoice = srcRaw * invoiceMultiplier;
    const months = parseInt(mode, 10);
    let installmentRaw = invoice / months;

    function roundSpecial(n){
      const abs = Math.abs(Math.floor(n));
      const s = abs.toString();
      const len = s.length;
      if(len === 7){
        const prefix = s.slice(0,2);
        return Math.sign(n) * parseInt(prefix + '0'.repeat(5), 10);
      }
      if(len === 8){
        const prefix = s.slice(0,2);
        return Math.sign(n) * parseInt(prefix + '0'.repeat(6), 10);
      }
      if(len === 9){
        const prefix = s.slice(0,3);
        return Math.sign(n) * parseInt(prefix + '0'.repeat(6), 10);
      }
      if(len === 10){
        const prefix = s.slice(0,3);
        return Math.sign(n) * parseInt(prefix + '0'.repeat(7), 10);
      }
      return Math.round(n);
    }

    const installmentRounded = roundSpecial(installmentRaw);
    const guaranteeRaw = invoice * 1.25;
    const guaranteeRounded = roundSpecial(guaranteeRaw);

    const welfareInvoice = document.getElementById('welfareInvoice');
    const welfareInstallment = document.getElementById('welfareInstallment');
    const welfareGuarantee = document.getElementById('welfareGuarantee');
    const welfareOriginal = document.getElementById('welfareOriginalPrice');

    if(welfareInvoice) welfareInvoice.textContent = fmtNumber(invoice, 0) + ' ریال';
    if(welfareInstallment) welfareInstallment.textContent = fmtNumber(installmentRounded, 0) + ' ریال';
    if(welfareGuarantee) welfareGuarantee.textContent = fmtNumber(guaranteeRounded, 0) + ' ریال';
    if(welfareOriginal && discountEnabled){
      const origMult = CONSTANTS.WELFARE_MULTIPLIERS_DEFAULT[mode];
      const origInvoice = srcRaw * origMult;
      welfareOriginal.textContent = fmtNumber(origInvoice, 0) + ' ریال';
    }
  };

  // اضافه کردن رویداد به chequeMode
  if (chequeMode) {
    chequeMode.addEventListener('change', computeChequeFn);
  }

  // اضافه کردن رویداد به welfareMode
  if (welfareMode) {
    welfareMode.addEventListener('change', computeWelfareFn);
  }

  // اجرای setupTabs
  setupTabs(computeChequeFn, computeWelfareFn, rawPriceVal);
  
}, 60);

    });
    grid.appendChild(card);
  });
}

function applySearchFilter(){
  if(!searchInput) return;
  const q = (searchInput.value || '').toString().trim().toLowerCase();
  const cards = Array.from(grid.children || []);
  if(!q){
    cards.forEach(c=> c.classList.remove('hidden'));
    return;
  }
  cards.forEach(c=>{
    const nm = (c.dataset && c.dataset.name) ? c.dataset.name : '';
    const keep = nm.indexOf(q) !== -1;
    c.classList.toggle('hidden', !keep);
  });
}

if(searchInput){
  searchInput.addEventListener('input', ()=> applySearchFilter());
}

const customBtn = document.getElementById('customPrice');
if(customBtn){
  customBtn.addEventListener('click', ()=>{
    showModal(`<div class="mb-4 text-lg font-medium">محاسبه با قیمت دلخواه</div>
      <div class="mb-4"><input id="customPriceInput" type="text" placeholder="مبلغ را وارد کنید" class="w-full px-3 py-2 border rounded" onclick="this.select()"/></div>
      <div id="customPriceResult"></div>`);

    const inp = document.getElementById('customPriceInput');
    const out = document.getElementById('customPriceResult');

    function addThousandsSeparators(s){
      if(!s) return '';
      const parts = s.split('.');
      const intPart = parts[0].replace(/^0+(?=\d)|[^0-9\-]/g, '');
      const sign = intPart.startsWith('-') ? '-' : '';
      const abs = sign ? intPart.slice(1) : intPart;
      const withCommas = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return sign + withCommas + (parts[1] ? ('.' + parts[1]) : '');
    }

    function formatInputWithCaret(el){
      const start = el.selectionStart;
      const oldVal = el.value;
      const cleanedForFormat = oldVal.replace(/[^0-9.\-]/g, '');
      const newVal = addThousandsSeparators(cleanedForFormat);
      el.value = newVal;
      const diff = newVal.length - oldVal.length;
      const newPos = Math.max(0, start + diff);
      try{ el.setSelectionRange(newPos, newPos); }catch(e){}
    }

    function renderCustom() {
    const rawInput = (inp.value || '').toString().trim();
    const cleaned = rawInput.replace(/[,\s]/g, '').replace(/[^0-9.\-]/g, '');
    
    if (!cleaned) {
        out.innerHTML = '<div class="text-center text-gray-500 py-6">مبلغی وارد نشده است</div>';
        return;
    }

    const num = parseFloat(cleaned) || 0;
    if (num <= 0) {
        out.innerHTML = '<div class="text-center text-red-600 py-6">لطفاً مبلغ معتبر وارد کنید</div>';
        return;
    }

    // رندر html تب‌دار
    out.innerHTML = buildModalHtml('', num, false, true, null, null, null, false, false);

    // صبر کوتاه تا DOM آماده شود + attach listener مستقل
    setTimeout(() => {
        // پیدا کردن container دکمه‌ها (کلاس‌هایی که در buildModalHtml استفاده کردی)
        const tabContainer = document.querySelector('#customPriceResult .flex.gap-2.mb-4.flex-wrap');
        if (!tabContainer) {
            console.warn("Container تب‌ها در customPriceResult پیدا نشد");
            return;
        }

        // برای جلوگیری از چندبار attach → clone و جایگزین
        const newContainer = tabContainer.cloneNode(true);
        tabContainer.parentNode.replaceChild(newContainer, tabContainer);

        // همه محتواها را ابتدا مخفی کن
        const contents = ['tab24Content', 'tab30Content', 'tab36Content'];
        contents.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        // listener کلیک
        newContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('button');
            if (!btn) return;

            const btnId = btn.id;
            let contentId = null;

            if (btnId === 'tab24') contentId = 'tab24Content';
            else if (btnId === 'tab30') contentId = 'tab30Content';
            else if (btnId === 'tab36') contentId = 'tab36Content';

            if (!contentId) return;

            // تغییر استایل دکمه‌ها
            newContainer.querySelectorAll('button').forEach(b => {
                b.classList.remove('bg-indigo-600', 'text-white');
                b.classList.add('bg-white', 'text-gray-700', 'border');
            });
            btn.classList.remove('bg-white', 'text-gray-700', 'border');
            btn.classList.add('bg-indigo-600', 'text-white');

            // سوئیچ محتوا
            contents.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            const target = document.getElementById(contentId);
            if (target) target.classList.remove('hidden');
        });

        // فعال‌سازی تب اول به صورت خودکار (اولین دکمه‌ای که وجود دارد)
        const firstBtn = newContainer.querySelector('button');
        if (firstBtn) firstBtn.click();

    }, 150);   // 150ms معمولاً کافی است
}

    inp.addEventListener('input', (e)=>{
      formatInputWithCaret(inp);
      renderCustom();
    });
    inp.addEventListener('blur', ()=>{ inp.value = addThousandsSeparators((inp.value||'').replace(/[^0-9.\-]/g,'')); });
    inp.addEventListener('focus', ()=>{ inp.value = (inp.value||'').replace(/,/g,''); });
    inp.focus();
    renderCustom();
  });
}

let sheetJsLoaded = false;
function loadSheetJS(){
  return new Promise((resolve, reject)=>{
    if(sheetJsLoaded && window.XLSX) return resolve();
    const trySrc = async (src)=>{
      return new Promise((res, rej)=>{
        const s = document.createElement('script');
        s.src = src;
        s.onload = ()=>res();
        s.onerror = ()=>rej(new Error('failed'));
        document.head.appendChild(s);
      });
    };
    (async ()=>{
      try{
        await trySrc('./vendor/xlsx.full.min.js');
        sheetJsLoaded = true;
        return resolve();
      }catch(_){
        try{
          await trySrc('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
          sheetJsLoaded = true;
          return resolve();
        }catch(err){
          return reject(new Error('Failed to load SheetJS from local and CDN'));
        }
      }
    })();
  });
}

const tryLoadEmbedded = async () => {
  if(typeof EMBEDDED_CSV === 'undefined' && typeof EMBEDDED_XLSX_BASE64 === 'undefined'){
    const tryLoadScript = (src) => new Promise((res)=>{
      try{
        const s = document.createElement('script');
        s.src = src;
        s.onload = ()=>res(true);
        s.onerror = ()=>res(false);
        document.head.appendChild(s);
      }catch(_){ res(false); }
    });
    await tryLoadScript('./scripts/embedded_list.js');
  }
  if(typeof EMBEDDED_CSV !== 'undefined' && EMBEDDED_CSV){
    const arr = parseCSV(EMBEDDED_CSV);
    const objs = arrayToObjects(arr);
    renderProducts(objs);
    return;
  }
  if(typeof EMBEDDED_XLSX_BASE64 !== 'undefined' && EMBEDDED_XLSX_BASE64){
    const b64 = EMBEDDED_XLSX_BASE64.replace(/\s+/g,'');
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for(let i=0;i<len;i++) bytes[i] = binaryString.charCodeAt(i);
    await loadSheetJS();
    const workbook = XLSX.read(bytes.buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
    const arr = parseCSV(csv);
    const objs = arrayToObjects(arr);
    renderProducts(objs);
    return;
  }
  renderProducts([]);
};

tryLoadEmbedded();
renderProducts([]);

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') hideModal();
});

document.addEventListener('keydown', (event) => {
    if(event.target.matches('#customPriceInput') && event.key === 'Enter') {
        event.preventDefault();
        let value = event.target.value.trim();
        if(value && !isNaN(value)) {
            event.target.value = value + '0000000';
            event.target.dispatchEvent(new Event('input', { bubbles: true }));
            event.target.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
});


// ========== مدیریت ساده تب‌ها ==========
function setupTabs(computeChequeFn = null, computeWelfareFn = null) {

  // پیدا کردن هر دکمه تب موجود
  const possibleButtons = [
    document.getElementById('tab24'),
    document.getElementById('tab36'),
    document.getElementById('tab36Single'),
    document.getElementById('tabCheque'),
    document.getElementById('tabWelfare')
  ].filter(Boolean);

  if (!possibleButtons.length) return;

  // گرفتن container واقعی از والد اولین دکمه موجود
  const tabContainer = possibleButtons[0].parentElement;
  if (!tabContainer) return;

  function hideAllContents() {
    const ids = [
      'tab24Content',
	  'tab30Content',
      'tab36Content',
      'tabChequeContent',
      'tabWelfareContent',
      'mainRowsContent'
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  function deactivateAllButtons() {
    const buttons = tabContainer.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.classList.remove('bg-indigo-600', 'text-white');
      btn.classList.add('bg-white', 'text-gray-700', 'border');
    });
  }

  tabContainer.addEventListener('click', function (e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const btnId = btn.id;
    let contentId = null;

    if (btnId === 'tab24') contentId = 'tab24Content';
    else if (btnId === 'tab36') contentId = 'tab36Content';
    else if (btnId === 'tabCheque') contentId = 'tabChequeContent';
    else if (btnId === 'tabWelfare') contentId = 'tabWelfareContent';
    else if (btnId === 'tab36Single') contentId = 'mainRowsContent';
	else if (btnId === 'tab30') contentId = 'tab30Content';
	else if (btnId === 'tabCheque' && computeChequeFn) {setTimeout(computeChequeFn, 10);}

    const content = document.getElementById(contentId);
    if (!content) return;

    deactivateAllButtons();
    hideAllContents();

    btn.classList.remove('bg-white', 'text-gray-700', 'border');
    btn.classList.add('bg-indigo-600', 'text-white');
    content.classList.remove('hidden');

    // اجرای محاسبات مربوطه
    if (btnId === 'tabCheque' && typeof computeChequeFn === 'function') {
      setTimeout(computeChequeFn, 10);
    }

    if (btnId === 'tabWelfare' && typeof computeWelfareFn === 'function') {
      setTimeout(computeWelfareFn, 10);
    }
  });

  // فعال‌سازی تب پیش‌فرض (اولین تب موجود)
  setTimeout(() => {
    possibleButtons[0].click();
  }, 50);
}
