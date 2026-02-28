// ====== Expert Formatting & Safety Utility ======
window.safeFormat = function (val, decimals, suffix) {
    if (val === null || val === undefined || isNaN(val)) return '<span style="color:#999;font-style:italic;">غير متوفر</span>';
    var num = Number(val);
    return (num.toFixed(decimals || 0)) + (suffix || '');
};

// UI Shim for loading status
function updateLoadingStatus(text, progress) {
    if (typeof showLoading === 'function') {
        showLoading(text + (progress ? ' (' + progress + '%)' : ''));
    } else {
        console.log('LOADING:', text, progress);
    }
    if (progress === 100 && typeof hideLoading === 'function') hideLoading();
}
window.updateLoadingStatus = updateLoadingStatus;

// Safe nested property access (matches sage.js safeGet)
function safeGet(obj, key1, key2Sub, defaultVal) {
    if (!obj) return defaultVal;
    var v = obj[key1];
    if (v === undefined || v === null) return defaultVal;
    if (key2Sub !== null && key2Sub !== undefined && typeof v === 'object') {
        var inner = v[key2Sub];
        return (inner !== undefined && inner !== null) ? inner : defaultVal;
    }
    return v;
}
window.safeGet = safeGet;

// Collapsible section toggle (used in soil detail and reclamation panels)
function toggleSection(id) {
    var el = document.getElementById(id);
    var icon = document.getElementById(id + '-icon');
    if (el) {
        var shown = el.style.display !== 'none';
        el.style.display = shown ? 'none' : 'block';
        if (icon) icon.textContent = shown ? '?' : '?';
    }
}
window.toggleSection = toggleSection;

// ====== Subscription & Plan Manager ======
var userContext = {
    plan: localStorage.getItem('sage_plan') || 'free',
    usage: JSON.parse(localStorage.getItem('sage_usage')) || { farmer: 0, researcher: 0 }
};

// ====== Visualization Palettes (Expert Indices) ======
var visParamsDict = {
    'NDVI': { min: 0, max: 0.8, palette: ['red', 'yellow', 'green', 'darkgreen'] },
    'EVI': { min: 0, max: 0.8, palette: ['red', 'yellow', 'green', 'darkgreen'] },
    'SAVI': { min: 0, max: 0.5, palette: ['red', 'yellow', 'green'] },
    'NDMI': { min: -0.2, max: 0.4, palette: ['brown', 'yellow', 'blue'] }, // Moisture
    'NDWI': { min: -0.1, max: 0.3, palette: ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'] }, // Water/Moist
    'GCI': { min: 0, max: 4, palette: ['brown', 'yellow', 'green'] },
    'MNDWI': { min: -0.2, max: 0.4, palette: ['white', 'blue'] },
    'NDBI': { min: -0.2, max: 0.2, palette: ['green', 'yellow', 'red'] }, // Built-up
    'BSI': { min: 0, max: 0.3, palette: ['green', 'yellow', 'brown'] }, // Bare Soil
    'NBR': { min: -0.2, max: 0.5, palette: ['brown', 'yellow', 'green'] }, // Burn
    'NDSI': { min: -0.2, max: 0.4, palette: ['blue', 'cyan', 'white'] }, // Snow/Salinity
    'ClayRatio': { min: 0, max: 2, palette: ['yellow', 'brown'] },
    'IronOxide': { min: 0, max: 0.5, palette: ['yellow', 'red'] },

    // 🧪 New Super Expert Indices
    'GypsumIndex': { min: -0.1, max: 0.1, palette: ['white', '#e6e6fa', '#dda0dd', '#800080'] }, // Purple for Gypsum
    'CarbonateIndex': { min: 0, max: 0.5, palette: ['white', '#f5f5dc', '#ffd700'] }, // Gold/Beige for Carbonates
    'SI3': { min: 0, max: 0.2, palette: ['green', 'yellow', 'red'] }, // Salt Proxy
    'ESI': { min: 0, max: 0.5, palette: ['green', 'orange', 'red'] }, // Enhanced Salinity
    'SOM': { min: 0, max: 10, palette: ['#ffffe5', '#f7fcb9', '#addd8e', '#41ab5d', '#238443', '#005a32'] }, // Organic Matter
    'Turbidity': { min: 0, max: 1, palette: ['blue', 'green', 'brown'] },
    'Chlorophyll_a': { min: 0, max: 5, palette: ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'] }, // Vegetation Health
    'SI1': { min: 0, max: 0.5, palette: ['white', 'red'] },
    'SI2': { min: 0, max: 0.5, palette: ['white', 'red'] }
};

// ====== Soil Texture Dictionary ======
var textureClassNames = {
    1: 'طين (Clay)',
    2: 'طين رملي (Sandy Clay)',
    3: 'طين سلتي (Silty Clay)',
    4: 'طين رملي لومي (Sandy Clay Loam)',
    5: 'طين لومي (Clay Loam)',
    6: 'طين سلتي لومي (Silty Clay Loam)',
    7: 'لومي رملي (Sandy Loam)',
    8: 'لومي (Loam)',
    9: 'سلت لومي (Silt Loam)',
    10: 'رملي (Sand)',
    11: 'رملي لومي (Loamy Sand)',
    12: 'سلت (Silt)'
};

// ---------------------------------------------------------------
// 🎓 EXPERT AGRONOMIC DATABASE
// ---------------------------------------------------------------

var CROP_EXPERT_TASKS = {
    'قمح (Wheat)': {
        11: 'الزراعة: أضف السوبر فوسفات (100 كجم) واهتم بالتسوية.',
        12: 'الإنبات: رية المحاياة بعد 21 يوماً + جرعة يوريا.',
        1: 'الدرنات: اهتمام بالبوتاسيوم ورش متباعد للندوة.',
        2: 'النمو: إضافة الدفعة الأخيرة من النيتروجين والري بانتظام.',
        3: 'طرد السنابل: رش البوتاسيوم وافحص الصدأ الأصفر.',
        4: 'النضج: وقف الري قبل الحصاد بـ 15 يوماً.',
        5: 'الحصاد: انتظر اصفرار 90% من السنابل ثم احصد فوراً.',
        6: 'ما بعد الحصاد: تجهيز الأرض للمحصول التالي.'
    },
    'بطاطس (Potatoes)': {
        1: 'الدرنات: اهتمام بالبوتاسيوم ورش متباعد للندوة.',
        2: 'النمو: سحب المياه تدريجياً لزيادة الصلابة.',
        9: 'الزراعة: تجهيز التربة بالمادة العضوية والفسفور.',
        10: 'الإنبات: ريات خفيفة متقاربة وجرعة تنشيطية.',
        11: 'التحجيم: دفعات بوتاسيوم (سلفات) لتكبير الدرنات.'
    },
    'طماطم (Tomato)': {
        3: 'الزراعة: تشبيك الشتلات + حمض فوسفوريك على الري.',
        4: 'التزهير: رش بوتاسيوم + كالسيوم. راقب العنكبوت الأحمر.',
        5: 'التثمير: وقف التسميد النيتروجيني. رش منظمات نمو.',
        6: 'الحصاد: اقطف عند اللون البرتقالي الفاتح للتصدير.'
    }
};

var KC_TABLE = {
    'قمح': { kc: 1.15, nameEn: 'Wheat', waterNeed: 'متوسط' },
    'ذرة': { kc: 1.20, nameEn: 'Maize', waterNeed: 'عالي' },
    'أرز': { kc: 1.20, nameEn: 'Rice', waterNeed: 'عالي جداً' },
    'قطن': { kc: 1.15, nameEn: 'Cotton', waterNeed: 'متوسط-عالي' },
    'قصب': { kc: 1.25, nameEn: 'Sugarcane', waterNeed: 'عالي جداً' },
    'بطاطس': { kc: 1.15, nameEn: 'Potatoes', waterNeed: 'متوسط' },
    'طماطم': { kc: 1.15, nameEn: 'Tomato', waterNeed: 'متوسط-عالي' },
    'فول': { kc: 1.15, nameEn: 'Faba Bean', waterNeed: 'متوسط' },
    'برسيم': { kc: 0.95, nameEn: 'Clover', waterNeed: 'متوسط' },
    'بنجر': { kc: 1.20, nameEn: 'Sugar Beet', waterNeed: 'متوسط-عالي' },
    'بصل': { kc: 1.05, nameEn: 'Onion', waterNeed: 'منخفض-متوسط' },
    'فلفل': { kc: 1.05, nameEn: 'Pepper', waterNeed: 'متوسط' },
    'خيار': { kc: 1.00, nameEn: 'Cucumber', waterNeed: 'متوسط' },
    'موالح': { kc: 0.65, nameEn: 'Citrus', waterNeed: 'متوسط' },
    'زيتون': { kc: 0.70, nameEn: 'Olive', waterNeed: 'منخفض' },
    'نخيل': { kc: 0.90, nameEn: 'Date Palm', waterNeed: 'متوسط' }
};

var CROP_EC_THRESHOLD = {
    'قمح': { ecMax: 6.0, yieldLoss10: 7.4, nameEn: 'Wheat' },
    'ذرة': { ecMax: 1.7, yieldLoss10: 2.5, nameEn: 'Maize' },
    'أرز': { ecMax: 3.0, yieldLoss10: 3.8, nameEn: 'Rice' },
    'قطن': { ecMax: 7.7, yieldLoss10: 9.6, nameEn: 'Cotton' },
    'قصب': { ecMax: 1.7, yieldLoss10: 3.4, nameEn: 'Sugarcane' },
    'بطاطس': { ecMax: 1.7, yieldLoss10: 2.5, nameEn: 'Potatoes' },
    'طماطم': { ecMax: 2.5, yieldLoss10: 3.5, nameEn: 'Tomato' },
    'برسيم': { ecMax: 2.0, yieldLoss10: 3.4, nameEn: 'Clover' },
    'بنجر': { ecMax: 7.0, yieldLoss10: 8.7, nameEn: 'Sugar Beet' },
    'شعير': { ecMax: 8.0, yieldLoss10: 10.0, nameEn: 'Barley' },
    'نخيل': { ecMax: 4.0, yieldLoss10: 6.8, nameEn: 'Date Palm' },
    'بصل': { ecMax: 1.2, yieldLoss10: 1.8, nameEn: 'Onion' }
};

var FERTILIZER_UNITS = {
    'قمح (Wheat)': { N: 75, P: 15, K: 24, urea: 163, super: 100, pot: 50, note: 'يحتاج دفعة تنشيطية عند التفريع' },
    'ذرة (Maize)': { N: 120, P: 30, K: 24, urea: 261, super: 200, pot: 50, note: 'شره للآزوت، يقسم على 3 دفعات' },
    'أرز (Rice)': { N: 60, P: 15, K: 0, urea: 130, super: 100, pot: 0, note: 'يفضل سلفات النشادر' },
    'قطن (Cotton)': { N: 60, P: 22, K: 24, urea: 130, super: 147, pot: 50, note: 'يحتاج توازن بين النمو الخضري والثمري' },
    'قصب السكر (Sugarcane)': { N: 180, P: 45, K: 48, urea: 391, super: 300, pot: 100, note: 'احتياجات سمادية ضخمة' },
    'بطاطس (Potatoes)': { N: 150, P: 60, K: 96, urea: 326, super: 400, pot: 200, note: 'شره جداً للبوتاسيوم لصب الدرنات' },
    'طماطم (Tomato)': { N: 100, P: 45, K: 80, urea: 217, super: 300, pot: 167, note: 'الكالسيوم ضروري جداً مع البوتاسيوم' },
    'فول سوداني (Peanuts)': { N: 20, P: 30, K: 24, urea: 43, super: 200, pot: 50, note: 'يحتاج جبس زراعي ضروري (كالسيوم)' },
    'برسيم (Alfalfa/Clover)': { N: 15, P: 22, K: 24, urea: 33, super: 147, pot: 50, note: 'يحتاج فوسفور لتنشيط الجذور' },
    'بنجر السكر (Sugar Beet)': { N: 80, P: 30, K: 48, urea: 174, super: 200, pot: 100, note: 'يحتاج بورون لرش الورق' }
};

function assessPestRisk(crop, rh, temp) {
    var risk = 'منخفضة ✅';
    var color = 'green';
    var msg = 'الظروف الجوية غير مناسبة لانتشار الآفات حالياً.';
    var c = crop.toLowerCase();
    var isWheat = c.includes('wheat') || c.includes('قمح');
    var isPotato = c.includes('potato') || c.includes('بطاطس');
    var isTomato = c.includes('tomato') || c.includes('طماطم');

    if (isWheat && rh > 60 && temp >= 15 && temp <= 25) {
        risk = '🔴 خطر داهم (الصدأ الأصفر)'; color = 'red';
        msg = 'رطوبة جوية عالية (' + rh.toFixed(0) + '%) وحرارة معتدلة: بيئة مثالية للصدأ.';
    } else if (isWheat && rh > 50 && temp > 25 && color !== 'red') {
        risk = '🟠 خطر متوسط (صدأ الساق/الأوراق)'; color = 'orange';
        msg = 'الرطوبة تدعم نمو الفطريات.';
    } else if (isPotato && rh > 85 && temp >= 10 && temp <= 20) {
        risk = '🔴 خطر الندوة المتأخرة (كارثي)'; color = 'red';
        msg = 'رطوبة جوية مشبعة! يجب الرش الوقائي فوراً.';
    } else if (isPotato && rh > 70) {
        risk = '🟠 خطر الندوة المبكرة'; color = 'orange';
        msg = 'الرطوبة عالية، افحص الأوراق السفلية.';
    } else if (isTomato && rh > 80 && temp < 20) {
        risk = '🔴 خطر الندوة المتأخرة'; color = 'red';
        msg = 'رطوبة عالية وحرارة منخفضة: بيئة مثالية للندوة.';
    } else if (temp > 30 && rh < 40) {
        risk = '🟠 خطر الإجهاد الحراري'; color = 'orange';
        msg = 'حرارة مرتفعة ورطوبة منخفضة (' + rh.toFixed(0) + '%) تزيد من الإجهاد المائي.';
    }
    return { risk: risk, color: color, msg: msg };
}

function checkCropCompatibility_FAO(crop, csi) {
    var classIndex = 0;
    var label = '✅ غير مالحة';
    var color = 'green';
    if (csi < 0.20) { classIndex = 0; label = '✅ غير مالحة'; color = 'green'; }
    else if (csi < 0.35) { classIndex = 1; label = '⚠️ ملوحة خفيفة'; color = '#FFB300'; }
    else if (csi < 0.55) { classIndex = 2; label = '⛔ ملوحة متوسطة'; color = '#FB8C00'; }
    else if (csi < 0.75) { classIndex = 3; label = '🛑 ملوحة مرتفعة'; color = '#D32F2F'; }
    else { classIndex = 4; label = '☠️ ملوحة شديدة'; color = '#B71C1C'; }

    var toleranceMap = {
        'الفراولة': 1,
        'البطاطس': 1,
        'الطماطم': 2,
        'الأرز': 2,
        'البرسيم': 2,
        'الذرة': 3,
        'القمح': 3,
        'النخيل': 4,
        'الشعير': 4,
        'البنجر': 4
    };
    var isCompatible = true;
    for (var k in toleranceMap) { if (crop.includes(k)) { if (classIndex > toleranceMap[k]) isCompatible = false; break; } }
    return { isCompatible: isCompatible, label: label, classIndex: classIndex, color: color };
}

function getExpertNote(crop, month) {
    var baseCrop = crop.split(' ')[0];
    for (var key in CROP_EXPERT_TASKS) {
        if (key.indexOf(baseCrop) > -1) {
            return CROP_EXPERT_TASKS[key][month] || CROP_EXPERT_TASKS[key]['all'] || "متابعة الحالة العامة والرش الوقائي.";
        }
    }
    return "حافظ على ري منتظم وتسميد متوازن.";
}

// ======= UNIFIED SOIL CLASSIFICATION (USDA TEXTURE TRIANGLE) =======
function classifyUSDATexture(clay, sand) {
    return getTextureName(clay, sand);
}

function getTextureName(clay, sand) {
    if (clay === null || sand === null || (clay + sand <= 0.1)) return 'غير متوفر';
    var silt = 100 - clay - sand;
    if (sand >= 85 && (silt + 1.5 * clay) < 15) return 'رملية';
    if (sand >= 70 && sand < 90 && (silt + 1.5 * clay) >= 15 && (silt + 2 * clay) < 30) return 'رملية طميية';
    if ((clay >= 7 && clay < 20 && sand > 52 && (silt + 2 * clay) >= 30) || (clay < 7 && silt < 50 && (silt + 2 * clay) >= 30)) return 'طميية رملية';
    if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'لومي (Loam)';
    if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'طميية سلتية';
    if (silt >= 80 && clay < 12) return 'سلت (Silt)';
    if (clay >= 20 && clay < 35 && sand > 45) return 'طين رملي لومي (Sandy Clay Loam)';
    if (clay >= 27 && clay < 40 && sand >= 20 && sand <= 45) return 'طين لومي (Clay Loam)';
    if (clay >= 27 && clay < 40 && sand < 20) return 'طين سلتي لومي (Silty Clay Loam)';
    if (clay >= 35 && sand >= 45) return 'طين رملي (Sandy Clay)';
    if (clay >= 40 && silt >= 40) return 'طين سلتي (Silty Clay)';
    if (clay >= 40 && sand <= 45 && silt < 40) return 'طينية';
    return 'غير محدد';
}

function checkAccess(feature) {
    if (userContext.plan === 'premium') return true;

    // Check if feature is in premium list
    if (CONFIG.SUBSCRIPTION.PREMIUM_FEATURES.indexOf(feature) !== -1) {
        return false;
    }

    // Check limits for free users
    if (feature === 'farmer_analysis' && userContext.usage.farmer >= CONFIG.SUBSCRIPTION.FREE_ANALYSIS_LIMIT) {
        return 'limit_reached';
    }

    return true;
}

function incrementUsage(type) {
    if (userContext.plan === 'premium') return;

    userContext.usage[type]++;
    localStorage.setItem('sage_usage', JSON.stringify(userContext.usage));
}

function upgradeToPremium() {
    userContext.plan = 'premium';
    localStorage.setItem('sage_plan', 'premium');
    alert('🎉 تهانينا! تم الترقية إلى SAGE Premium بنجاح.\nCongratulations! You have upgraded to SAGE Premium.');
    showWelcome();
}

// ====== Panel Management ======
function showPanel() {
    document.getElementById('sidePanel').classList.remove('hidden');
}

function hidePanel() {
    document.getElementById('sidePanel').classList.add('hidden');
    setActiveTab('tbMap');
}

function togglePanel() {
    var panel = document.getElementById('sidePanel');
    panel.classList.toggle('hidden');
}

function setPanelTitle(title) {
    document.getElementById('panelTitle').textContent = title;
}

function setPanelContent(html) {
    document.getElementById('panelBody').innerHTML = html;
}

function setActiveTab(id) {
    document.querySelectorAll('.toolbar-btn').forEach(function (btn) {
        btn.classList.remove('active');
    });
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
}

// ====== Mode Switching ======
function switchMode(mode) {
    currentMode = mode;
    window.mapClickEnabled = false;
    showPanel();

    if (mode === 'farmer') {
        setActiveTab('tbFarmer');

        // Clear Researcher specific map drawings when switching to Farmer
        if (typeof clearDrawnRegion === 'function') clearDrawnRegion();
        if (typeof clearGovBoundary === 'function') clearGovBoundary();
        if (typeof clearAllResLayers === 'function') clearAllResLayers();
        if (typeof disableDrawing === 'function') disableDrawing();

        buildFarmerMode();
    } else if (mode === 'researcher') {
        setActiveTab('tbResearcher');

        // Clear Farmer specific map markers when switching to Researcher
        if (currentMarker && map) map.removeLayer(currentMarker);
        if (currentCircle && map) map.removeLayer(currentCircle);
        if (typeof clearEELayers === 'function') clearEELayers();

        buildResearcherMode();
    }
}

// ====== Welcome Screen ======
function showWelcome() {
    currentMode = 'welcome';
    setActiveTab('tbHome');

    // Clear the map of all drawings, markers, and layers when returning Home
    if (typeof clearDrawnRegion === 'function') clearDrawnRegion();
    if (typeof clearGovBoundary === 'function') clearGovBoundary();
    if (typeof clearAllResLayers === 'function') clearAllResLayers();
    if (typeof disableDrawing === 'function') disableDrawing();
    if (currentMarker && map) map.removeLayer(currentMarker);
    if (currentCircle && map) map.removeLayer(currentCircle);
    if (typeof clearEELayers === 'function') clearEELayers();

    showPanel();
    setPanelTitle('🌿 SAGE Egypt');

    var planBadge = userContext.plan === 'premium'
        ? '<div style="background:#E8F5E9; color:#1B5E20; padding:6px; border-radius:20px; font-size:12px; font-weight:bold; margin-bottom:12px; border:1px solid #C8E6C9; display:inline-block;">💎 SAGE Premium Member</div>'
        : '<div style="background:#F5F5F5; color:#616161; padding:6px; border-radius:20px; font-size:11px; font-weight:bold; margin-bottom:12px; border:1px solid #E0E0E0; display:inline-block;">Standard Plan (' + userContext.usage.farmer + '/' + CONFIG.SUBSCRIPTION.FREE_ANALYSIS_LIMIT + ' Reports)</div>';

    var upgradeBtn = userContext.plan === 'free'
        ? '<button class="btn" style="background:linear-gradient(to right, #FFD700, #FFA000); color:#000; font-weight:bold; border:none; margin-top:10px;" onclick="upgradeToPremium()">🔓 الترقية إلى الإصدار المطور (Upgrade)</button>'
        : '';

    setPanelContent(
        '<div class="welcome-screen">' +
        '  <div class="welcome-logo">🌿</div>' +
        '  <h1 class="welcome-title">SAGE Egypt</h1>' +
        '  ' + planBadge +
        '  <p class="welcome-subtitle">الخبير الذكي للمعلومات المكانية الزراعية<br>Smart Agricultural Geo-Expert</p>' +
        '  <button class="btn btn-farmer" onclick="switchMode(\'farmer\')">' +
        '    🌾 وضع المزارع<span class="btn-desc">تقرير مبسط وتوصيات لمزرعتك</span>' +
        '  </button>' +
        '  <button class="btn btn-researcher" onclick="switchMode(\'researcher\')">' +
        '    🌍 وضع الباحث<span class="btn-desc">تحليل متقدم وخرائط تفاعلية</span>' +
        '  </button>' +
        '  ' + upgradeBtn +
        '  <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e0e0e0;">' +
        '    <p style="font-size:12px; color:#999;">👨‍🔬 Developer: ELSAYED FAROUK</p>' +
        '    <p style="font-size:11px; color:#bbb;">Faculty of Agriculture, Sohag University</p>' +
        '  </div>' +
        '</div>'
    );
}

// ====== Farmer Mode ======
// ====== Farmer Mode ======
function buildFarmerMode() {
    setPanelTitle('🌾 وضع المزارع');

    var crops = [
        '--- اختر المحصول (Select Crop) ---',
        'قمح (Wheat)', 'أرز (Rice)', 'ذرة (Maize)', 'قطن (Cotton)',
        'بطاطس (Potatoes)', 'طماطم (Tomato)', 'فول (Fava Bean)',
        'برسيم (Alfalfa/Clover)', 'قصب السكر (Sugarcane)', 'نخيل (Date Palm)',
        'بنجر السكر (Sugar Beet)', 'فول سوداني (Peanuts)',
        'موالح (Citrus)', 'زيتون (Olive)', 'عنب (Grape)',
        'بصل (Onion)', 'ثوم (Garlic)', 'فلفل (Pepper)',
        'باذنجان (Eggplant)', 'خيار (Cucumber)', 'كوسة (Zucchini)',
        'مانجو (Mango)', 'رمان (Pomegranate)', 'تين (Fig)',
        'لم أزرع بعد (Not Planted)',
        'محصول آخر (Other)'
    ];

    var cropOptions = crops.map(function (c) {
        return '<option value="' + c + '">' + c + '</option>';
    }).join('');

    setPanelContent(
        // Step 1: Location & Region
        '<div class="card">' +
        '  <div class="card-title">📍 1. الموقع والمنطقة</div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">المحافظة (Governorate)</label>' +
        '    <select id="fGovSelect" class="form-control" onchange="handleFarmerGovChange()">' +
        '      <option value="">-- اختر المحافظة --</option>' +
        '    </select>' +
        '  </div>' +
        '  <div class="form-row">' +
        '    <div class="form-group">' +
        '      <label class="form-label">Lat</label>' +
        '      <input type="number" id="fLat" class="form-control" placeholder="26.55" step="any" oninput="window._manualCoordsChanged=true">' +
        '    </div>' +
        '    <div class="form-group">' +
        '      <label class="form-label">Lng</label>' +
        '      <input type="number" id="fLng" class="form-control" placeholder="31.69" step="any" oninput="window._manualCoordsChanged=true">' +
        '    </div>' +
        '  </div>' +
        '  <button class="btn btn-outline btn-sm" style="width:100%; margin-bottom:8px;" onclick="applyManualCoords()">📍 تطبيق الإحداثيات اليدوية</button>' +
        '  <div style="display:flex; gap:8px;">' +
        '    <button class="btn btn-outline btn-sm" style="flex:1;" onclick="enableMapClick()">🗺️ الخريطة</button>' +
        '    <button class="btn btn-outline btn-sm" style="flex:1;" onclick="useGPS()">📡 GPS</button>' +
        '  </div>' +
        '  <div class="form-group mt-8">' +
        '    <label class="form-label">نطاق المزرعة (متر)</label>' +
        '    <input type="number" id="fBuffer" class="form-control" value="500" min="100" max="5000">' +
        '  </div>' +
        '</div>' +

        // Step 2: Crop
        '<div class="card">' +
        '  <div class="card-title">🌱 2. نوع المحصول</div>' +
        '  <div class="form-group">' +
        '    <select id="fCrop" class="form-control">' + cropOptions + '</select>' +
        '  </div>' +
        '</div>' +

        // Step 3: Time
        '<div class="card">' +
        '  <div class="card-title">📅 3. تاريخ التحليل</div>' +
        '  <div class="toggle-row">' +
        '    <span class="toggle-label">⚡ تحليل لحظي (Real-time)</span>' +
        '    <input type="checkbox" id="fRealtime" checked>' +
        '  </div>' +
        '  <div id="fDateRange" class="hidden">' +
        '    <div class="form-row">' +
        '      <div class="form-group"><input type="date" id="fStartDate" class="form-control" value="2024-01-01"></div>' +
        '      <div class="form-group"><input type="date" id="fEndDate" class="form-control" value="2024-12-31"></div>' +
        '    </div>' +
        '  </div>' +
        '</div>' +

        '<button class="btn btn-execute" onclick="executeFarmerAnalysis()">🚀 اصدار التقرير الشامل</button>' +
        '<div id="fStatus"></div>'
    );

    // Populate Gov Select
    loadGovernoratesList('fGovSelect');

    document.getElementById('fRealtime').addEventListener('change', function () {
        document.getElementById('fDateRange').classList.toggle('hidden', this.checked);
    });

    // Live circle resize when buffer value changes
    var bufferInput = document.getElementById('fBuffer');
    if (bufferInput) {
        bufferInput.addEventListener('input', function () {
            var r = parseInt(this.value) || 500;
            if (typeof updateBufferCircle === 'function') {
                updateBufferCircle(r);
            }
        });
    }
}

function handleFarmerGovChange() {
    var govName = document.getElementById('fGovSelect').value;
    if (!govName) return;
    window.currentGovName = govName;
    var adminBoundariesAsset = 'projects/ee-elsayedfarouk/assets/Egypt_GADM_Boundaries';
    var region = ee.FeatureCollection(adminBoundariesAsset).filter(ee.Filter.eq('NAME_1', govName));
    region.geometry().centroid().evaluate(function (c) {
        if (c) {
            var latEl = document.getElementById('fLat');
            var lngEl = document.getElementById('fLng');
            // Only auto-fill coords if the user has NOT manually entered coordinates
            if (latEl && (!latEl.value || !window._manualCoordsChanged)) {
                latEl.value = c.coordinates[1].toFixed(6);
                lngEl.value = c.coordinates[0].toFixed(6);
            }
            // Always center the map on the selected governorate
            centerMap(c.coordinates[1], c.coordinates[0], 10);
        }
    });
}

// Apply manually typed coordinates to map
function applyManualCoords() {
    var lat = parseFloat(document.getElementById('fLat').value);
    var lng = parseFloat(document.getElementById('fLng').value);
    if (isNaN(lat) || isNaN(lng)) {
        showMapToast('⚠️ حدد موقع المزرعة أولاً');
        return;
    }
    if (lat < 22 || lat > 32 || lng < 24 || lng > 37) {
        showMapToast('✅ تم تحديد موقعك بنجاح!');
        return;
    }
    var buffer = parseInt(document.getElementById('fBuffer').value) || 500;
    addMarker(lat, lng, '📍 موقعك الحالي');
    addBufferCircle(lat, lng, buffer);
    centerMap(lat, lng, 15);
    window._manualCoordsChanged = true;
    showMapToast('✅ الإحداثيات: ' + lat.toFixed(4) + ', ' + lng.toFixed(4));
}

// ====== Map Click Handler ======
function enableMapClick() {
    window.mapClickEnabled = true;
    hidePanel();
    showMapToast('📍 انقر على الخريطة لتحديد موقع مزرعتك');
}

function onMapClick(lat, lng) {
    if (!window.mapClickEnabled) return;
    window.mapClickEnabled = false;

    var latInput = document.getElementById('fLat');
    var lngInput = document.getElementById('fLng');
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);

    addMarker(lat, lng, '📍 مزرعتك');
    addBufferCircle(lat, lng, parseInt(document.getElementById('fBuffer').value) || 500);
    centerMap(lat, lng, 15);

    showPanel();
    showMapToast('✅ تم تحديد الموقع!');
}

function useGPS() {
    if (!navigator.geolocation) {
        alert('المتصفح لا يدعم GPS');
        return;
    }
    showLoading('جاري تحديد موقعك...');
    navigator.geolocation.getCurrentPosition(
        function (pos) {
            hideLoading();
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            document.getElementById('fLat').value = lat.toFixed(6);
            document.getElementById('fLng').value = lng.toFixed(6);
            addMarker(lat, lng, '📍 موقعك الحالي');
            centerMap(lat, lng, 15);
            showMapToast('✅ تم تحديد موقعك بنجاح!');
        },
        function (err) {
            hideLoading();
            alert('فشل تحديد الموقع: ' + err.message);
        },
        { enableHighAccuracy: true }
    );
}

// ====== Map Toast ======
function showMapToast(msg) {
    var existing = document.getElementById('mapToast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'mapToast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 20px;border-radius:25px;font-size:14px;z-index:200;box-shadow:0 4px 12px rgba(0,0,0,0.3);white-space:nowrap;font-family:Cairo,sans-serif;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3000);
}

// ====== Farmer Analysis Execution ======
function executeFarmerAnalysis() {
    var lat = parseFloat(document.getElementById('fLat').value);
    var lng = parseFloat(document.getElementById('fLng').value);
    var buffer = parseInt(document.getElementById('fBuffer').value) || 500;
    var crop = document.getElementById('fCrop').value;

    // Subscription Check
    var access = checkAccess('farmer_analysis');
    if (access === 'limit_reached') {
        setPanelContent(
            '<div class="card" style="text-align:center; border:2px solid #FF9800; padding:20px;">' +
            '  <div class="welcome-logo" style="font-size:40px; margin-bottom:10px;">⚠️</div>' +
            '  <h3 style="color:#E65100; margin-bottom:10px;">عذراً، انتهى الحد المسموح</h3>' +
            '  <p style="font-size:14px; color:#666; margin-bottom:20px;">لقد استهلكت جميع التحليلات المجانية المتاحة (' + CONFIG.SUBSCRIPTION.FREE_ANALYSIS_LIMIT + '). يرجى الترقية للمتابعة.</p>' +
            '  <button class="btn" style="background:linear-gradient(to right, #FFD700, #FFA000); color:#000; font-weight:bold; border:none; width:100%;" onclick="upgradeToPremium()">🔓 الترقية للوصول غير المحدود</button>' +
            '  <button class="btn btn-outline" style="margin-top:12px; width:100%;" onclick="showWelcome()">🔙 العودة للرئيسية</button>' +
            '</div>'
        );
        return;
    }

    // Validation
    if (crop === '--- اختر المحصول (Select Crop) ---') {
        showMapToast('⚠️ اختر المحصول أولاً');
        return;
    }
    if (isNaN(lat) || isNaN(lng)) {
        showMapToast('⚠️ حدد موقع المزرعة أولاً');
        return;
    }
    if (lat < 22 || lat > 32 || lng < 24 || lng > 37) {
        showMapToast('⚠️ الإحداثيات خارج حدود مصر!');
    }

    var startDate, endDate, isRealtime;
    var realtimeEl = document.getElementById('fRealtime');
    isRealtime = realtimeEl ? realtimeEl.checked : true;

    if (isRealtime) {
        var now = new Date();
        var ago = new Date();
        ago.setDate(now.getDate() - 30);
        endDate = now.toISOString().split('T')[0];
        startDate = ago.toISOString().split('T')[0];
    } else {
        startDate = document.getElementById('fStartDate').value;
        endDate = document.getElementById('fEndDate').value;
    }

    // Show loading
    setPanelTitle('🔬 جاري التحليل...');
    setPanelContent(
        '<div style="text-align:center; padding:40px 20px;">' +
        '  <div class="spinner" style="margin:0 auto;"></div>' +
        '  <p id="loading-main-text" style="margin-top:16px; font-weight:600; color:#666;">جاري التحقق من الغطاء الأرضي...</p>' +
        '  <div id="fStatus" style="min-height:20px; margin-top:10px;"></div>' +
        '  <div style="width:100%; bg:#eee; height:4px; border-radius:2px; margin-top:20px; overflow:hidden;">' +
        '    <div id="loading-progress" style="width:10%; height:100%; background:#4CAF50; transition: width 0.3s;"></div>' +
        '  </div>' +
        '  <p style="font-size:11px; color:#999; margin-top:8px;">قد يستغرق هذا 15-30 ثانية</p>' +
        '</div>'
    );

    addMarker(lat, lng, '📍 ' + crop);
    addBufferCircle(lat, lng, buffer);
    centerMap(lat, lng, 15);

    // Create EE geometry
    var farmPoint = ee.Geometry.Point([lng, lat]);
    var farmArea = farmPoint.buffer(buffer);

    // Step 1: Validate location
    var validationStart = startDate;
    var validationEnd = endDate;
    // Use 1 year range for real-time validation
    if (isRealtime) {
        var yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        validationStart = yearAgo.toISOString().split('T')[0];
    }

    // Safety Timeout: Show "Skip" button if validation hangs for >6s
    var validationTimeout = setTimeout(function () {
        console.warn('⚠️ Validation slow, offering skip...');
        updateLoadingStatus('⚠️ التحقق مستغرق للوقت... يمكنك التخطي للمتابعة.');

        // Add Skip Button
        var statusDiv = document.getElementById('fStatus');
        if (statusDiv && !document.getElementById('btnSkipVal')) {
            statusDiv.innerHTML += '<div style="margin-top:10px;"><button class="btn btn-sm btn-warning" id="btnSkipVal" style="background:#ff9800; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">⏩ تخطي الفحص والبدء فوراً</button></div>';
            document.getElementById('btnSkipVal').onclick = function () {
                clearTimeout(validationTimeout);
                clearTimeout(autoProceedTimeout);
                updateLoadingStatus('🚀 تم تخطي الفحص، جاري البدء...');
                runFullAnalysis(farmArea, farmPoint, startDate, endDate, crop, lat, lng, buffer, false, false);
            };
        }
    }, 6000);

    // Auto-proceed if it hangs for >20s
    var autoProceedTimeout = setTimeout(function () {
        var btn = document.getElementById('btnSkipVal');
        if (btn) {
            console.log('🤖 Auto-skipping validation hang...');
            btn.click();
        }
    }, 20000);

    var validationStats = validateFarmLocation(farmArea, validationStart, validationEnd);
    console.log('📡 Starting location validation for:', lat, lng);

    validationStats.evaluate(function (vResult, vError) {
        clearTimeout(validationTimeout); // Clear timeout if successful
        clearTimeout(autoProceedTimeout);

        if (vError) {
            console.error('❌ Validation error:', vError);
            var errMsg = vError.toString();
            if (errMsg.includes('Invalid JSON') || errMsg.includes('Connection closed')) {
                updateLoadingStatus('⚠️ خطأ في الاتصال بـ Google Earth Engine. تأكد من سرعة الإنترنت أو عطّل مانع الإعلانات (AdBlocker) وأعد المحاولة.');
            } else {
                updateLoadingStatus('⚠️ خطأ في الفحص، جاري المتابعة للتحليل المباشر...');
            }
            // Proceed despite validation error
            runFullAnalysis(farmArea, farmPoint, startDate, endDate, crop, lat, lng, buffer, false, false);
            return;
        }
        console.log('✅ Validation complete:', vResult);

        // In some EE cases the callback returns null/undefined without explicit error.
        // Avoid breaking on property access and continue with full analysis.
        if (!vResult || typeof vResult !== 'object') {
            console.warn('Validation returned empty result, skipping validation gate.');
            runFullAnalysis(farmArea, farmPoint, startDate, endDate, crop, lat, lng, buffer, false, false);
            return;
        }

        function pickNumber(obj, keys, fallback) {
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (obj[key] !== undefined && obj[key] !== null && !isNaN(obj[key])) {
                    return Number(obj[key]);
                }
            }
            return fallback;
        }

        // Evaluate validation
        var cropsProb = pickNumber(vResult, ['crops_prob', 'crops'], 0);
        var bareProb = pickNumber(vResult, ['bare_prob', 'bare'], 0);
        var builtProb = pickNumber(vResult, ['built_prob', 'built'], 0);
        var grassProb = pickNumber(vResult, ['grass_prob', 'grass'], 0); // ?? Recently planted fields often show as grass
        var ndviMax = pickNumber(vResult, ['ndvi_max', 'NDVI_max'], 0);
        var ndviMin = pickNumber(vResult, ['ndvi_min', 'NDVI_min'], 0);
        var ndviRange = pickNumber(vResult, ['ndvi_range'], Math.max(0, ndviMax - ndviMin));
        var bsiMean = pickNumber(vResult, ['bsi_mean', 'BSI_mean'], 0);
        var ndbiMean = pickNumber(vResult, ['ndbi_mean', 'NDBI_mean'], 0);
        var albedoMean = pickNumber(vResult, ['albedo_mean', 'Albedo_mean'], 0);
        // Sentinel-2 reflectance bands are scaled 0-10000 ? normalize to 0-1
        if (albedoMean > 1.0) albedoMean = albedoMean / 10000;
        var ndviStdDev = pickNumber(vResult, ['ndvi_stdDev', 'NDVI_stdDev'], 0);

        var observationCount = pickNumber(vResult, ['observation_count'], 0);

        // --- Desert detection ----------------------------------------------
        var desertReasons = [];
        if (ndviMax < 0.15) desertReasons.push('NDVI منخفض جداً (' + ndviMax.toFixed(3) + ')');
        if (bsiMean > 0.05) desertReasons.push('BSI مرتفع (' + bsiMean.toFixed(3) + ')');

        // Only check seasonal variation if we have enough data points (at least 2)
        if (observationCount > 1 && ndviRange < 0.1) {
            desertReasons.push('لا يوجد تباين موسمي (' + ndviRange.toFixed(3) + ')');
        }

        if (albedoMean > 0.15) desertReasons.push('انعكاسية عالية (' + albedoMean.toFixed(3) + ')');
        if (ndviStdDev < 0.05) desertReasons.push('تجانس مكاني عالي (صحراء موحدة)');

        var isDesert = (desertReasons.length >= 3) || (bareProb > 0.6 && ndviMax < 0.2);
        var isUrban = (builtProb > 0.35) || (ndbiMean > 0.1 && builtProb > cropsProb);
        if (isUrban) isDesert = false;

        // --- ?? ACCURACY GUARDS: protect recently planted / newly harvested fields --
        // Guard 1: crops + grass probability > 30% ? this is a vegetated field, NOT desert
        var vegetationProb = cropsProb + grassProb;
        if (vegetationProb > 0.30) {
            console.log('🌵 Desert guard 1: vegetation probability', (vegetationProb * 100).toFixed(1) + '% — marking as agricultural');
            isDesert = false;
        }

        // Guard 2: NDVI in borderline zone (0.10-0.20) with <4 desert criteria
        // ? could be a newly planted field or recently harvested field, not true desert
        if (ndviMax >= 0.10 && ndviMax < 0.20 && desertReasons.length < 4) {
            console.log('🌵 Desert guard 2: NDVI borderline', ndviMax.toFixed(3), '— less than 4 criteria — keeping open');
            isDesert = false;
        }

        // Guard 3: if cropsProb > builtProb and cropsProb > bareProb ? probable farmland
        if (cropsProb > builtProb && cropsProb > bareProb && cropsProb > 0.15) {
            console.log('🌵 Desert guard 3: crops probability', (cropsProb * 100).toFixed(1) + '% dominant — not desert');
            isDesert = false;
        }

        // Parity with sage.js: Always proceed to full analysis, passing suitability flags
        updateLoadingStatus('⚠️ خطأ في الفحص، جاري المتابعة...');
        runFullAnalysis(farmArea, farmPoint, startDate, endDate, crop, lat, lng, buffer, isDesert, isUrban);
    });
}

function updateLoadingStatus(msg, percent) {
    var status = document.getElementById('fStatus');
    if (status) status.innerHTML = '<p style="font-size:13px; color:#2E7D32; text-align:center; margin:0;">' + msg + '</p>';

    var mainText = document.getElementById('loading-main-text');
    if (mainText && percent > 20) mainText.textContent = 'جاري تحليل البيانات...';

    var progress = document.getElementById('loading-progress');
    if (progress && percent !== undefined) progress.style.width = percent + '%';
}

function showDesertWarning(reasons) {
    setPanelTitle('🏜️ تنبيه: منطقة صحراوية');
    var reasonsHTML = reasons.map(function (r) { return '<li style="margin:4px 0;font-size:13px;">' + r + '</li>'; }).join('');
    setPanelContent(
        '<div class="card" style="border-left:4px solid #FF8F00;">' +
        '  <div class="card-title" style="color:#E65100;">🏜️ منطقة صحراوية جرداء</div>' +
        '  <p style="font-size:13px; color:#555;">هذا الموقع يقع في منطقة صحراوية غير صالحة للزراعة مباشرة.</p>' +
        '  <ul style="list-style:none;padding:0;margin:12px 0;color:#666;">' + reasonsHTML + '</ul>' +
        '  <div style="padding:10px;background:#FFF3E0;border-radius:8px;margin-top:12px;">' +
        '    <p style="font-weight:600;color:#E65100;margin-bottom:8px;">💡 الخيارات المتاحة:</p>' +
        '    <p style="font-size:13px;color:#555;">🚜 خطة الاستصلاح</p>' +
        '  </div>' +
        '</div>' +
        '<button class="btn btn-back" onclick="buildFarmerMode()">🔙 رجوع للإدخال</button>'
    );
}

function showUrbanWarning(farmArea, farmPoint, startDate, endDate, crop, lat, lng, buffer) {
    setPanelTitle('🏙️ تنبيه: منطقة حضرية');
    setPanelContent(
        '<div class="card" style="border-left:4px solid #D32F2F;">' +
        '  <div class="card-title" style="color:#D32F2F;">🏙️ منطقة عمرانية/مباني</div>' +
        '  <p style="font-size:13px; color:#555;">تم رصد منطقة عمرانية في هذا الموقع.</p>' +
        '</div>' +
        '<button class="btn btn-execute" onclick="forceUrbanAnalysis()" style="background:#FF9800;">⚠️ متابعة التقرير الحالي</button>' +
        '<button class="btn btn-back" onclick="buildFarmerMode()">🔙 رجوع</button>'
    );
    // Store params for force-continue
    window._pendingAnalysis = { farmArea: farmArea, farmPoint: farmPoint, startDate: startDate, endDate: endDate, crop: crop, lat: lat, lng: lng, buffer: buffer };
}

function forceUrbanAnalysis() {
    var p = window._pendingAnalysis;
    if (!p) return;
    setPanelContent(
        '<div style="text-align:center; padding:40px 20px;">' +
        '  <div class="spinner" style="margin:0 auto;"></div>' +
        '  <p style="margin-top:16px; font-weight:600; color:#666;">جاري التحليل...</p>' +
        '</div>'
    );
    runFullAnalysis(p.farmArea, p.farmPoint, p.startDate, p.endDate, p.crop, p.lat, p.lng, p.buffer, false, true);
}

// ----------------------------------------------------------------
// OPTICAL HELPER: SENTINEL-2 -> LANDSAT FALLBACK
// ----------------------------------------------------------------
function pickOpticalCollectionAuto(startDate, endDate, region, cb) {
    var s2Col = getS2Collection(startDate, endDate, region);

    s2Col.size().evaluate(function (s2Size, s2Err) {
        if (!s2Err && s2Size && s2Size > 0) {
            return cb({
                col: s2Col,
                sensor: 'Sentinel-2',
                scale: 10
            });
        }

        console.warn('⚠️ No Sentinel-2 images. Fallback to Landsat optical...');

        // Landsat merged collection contains LST too, we keep only optical bands here
        var lsOptical = getMergedLandsatCollection(startDate, endDate, region)
            .select(['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']);

        lsOptical.size().evaluate(function (lsSize, lsErr) {
            if (!lsErr && lsSize && lsSize > 0) {
                return cb({
                    col: lsOptical,
                    sensor: 'Landsat',
                    scale: 30
                });
            }

            return cb({
                col: null,
                sensor: null,
                scale: null
            });
        });
    });
}

// ----------------------------------------------------------------
// FULL ANALYSIS ENGINE (Expert Fusion Console V2.5)
// ----------------------------------------------------------------
function runFullAnalysis(farmArea, farmPoint, startDate, endDate, cropType, lat, lng, bufferSize, isBarren, isUrban) {
    incrementUsage('farmer');
    var isNotPlanted = (cropType.indexOf('Not Planted') > -1 || cropType.indexOf('لم أزرع') > -1);
    updateLoadingStatus('📡 جاري استخراج البيانات (Optimized)...', 25);

    // Call the optimized backend function
    var reportTask = getOptimizedFarmerReport(lat, lng, bufferSize, startDate, endDate, cropType);

    // Asynchronous evaluation to prevent browser timeouts
    reportTask.evaluate(function (result, error) {
        if (error) {
            console.error('Analysis Finalization Error:', error);
            updateLoadingStatus('⚠️ عذراً، خطأ في التحليل النهائي.');
            return;
        }


        updateLoadingStatus('🛰️ جاري معالجة بيانات الرادار والمناخ...', 50);

        // Fetch time series for chart (kept separate for collection efficiency)
        var optCol = getS2Collection(startDate, endDate, farmArea);
        var ndviTimeSeries = optCol.map(function (img) {
            var mean = indicesDict['NDVI'](img).reduceRegion({ reducer: ee.Reducer.mean(), geometry: farmPoint, scale: 10 });
            return ee.Feature(null, { NDVI: mean.get('NDVI'), date: img.date().format('YYYY-MM-dd') });
        }).sort('date');

        ndviTimeSeries.aggregate_array('NDVI').evaluate(function (ndviArr) {
            ndviTimeSeries.aggregate_array('date').evaluate(function (dateArr) {
                // Shaping results for renderFullReport compatibility
                var farmSizeM2 = bufferSize * bufferSize * Math.PI;
                var anomalyArea = (result.Anomalies || 0) * farmSizeM2;

                var structured = {
                    ndvi: { NDVI: result.NDVI },
                    evi: { EVI: result.EVI },
                    ndmi: { NDMI: result.NDMI },
                    bsi: { BSI: result.BSI },
                    savi: { SAVI: result.SAVI },
                    gci: { GCI: result.GCI },
                    vhi: { VCI: (result.VHI || 0.5) * 100 },
                    rh: { RH: result.RH },
                    airTemp: { air_temp_C: result.air_temp_C },
                    windSpeed: { WindSpeed: result.WindSpeed },
                    sm: { sm_topsoil_m3m3: result.sm_topsoil_m3m3 },
                    smRoot: { sm_rootzone_m3m3: result.sm_rootzone_m3m3 },
                    smHighRes: { SM_HighRes: result.SM_HighRes },
                    lst: { LST: result.LST },
                    et: { ET: result.ET },
                    precip: { Precipitation: result.Precipitation },
                    si3_check: { SI3_Check: result.SI3 || result.SI3_Check },
                    ndsi: { NDSI: result.NDSI },
                    esi: { ESI: result.ESI },
                    clayRatio: { ClayRatio: result.ClayRatio },
                    ironOxide: { IronOxide: result.IronOxide },
                    gypsumIndex: { GypsumIndex: result.GypsumIndex },
                    carbonateIndex: { CarbonateIndex: result.CarbonateIndex },
                    ec_dsm: { EC_dSm: result.EC_dSm },
                    ec_v25: { EC_V25: result.EC_V25 },
                    gdd: { GDD: result.gdd },
                    anomalies: { sum: anomalyArea },
                    currentMonth: new Date(endDate).getMonth() + 1,
                    olmSoil: {
                        Clay: result.Clay, Sand: result.Sand, Silt: result.Silt,
                        pH: result.pH, Nitrogen: result.Nitrogen, SOC: result.SOC,
                        CEC: result.CEC, BD: result.BD, FC: result.FC, WP: result.WP, PAW: result.PAW
                    },
                    landSuitability: {
                        crops_prob: result.crops_prob,
                        built_prob: result.built_prob,
                        bare_prob: result.bare_prob,
                        ndvi_max: result.ndvi_max_val,
                        ndvi_range: result.ndvi_range_val,
                        bsi_mean: result.bsi_mean_val,
                        ndbi_mean: result.ndbi_mean_val,
                        albedo_mean: result.albedo_mean_val,
                        ndvi_stdDev: result.ndvi_stdDev_val
                    }
                };

                // ======= ENHANCED LAND VALIDATION (Parity with sage.js) =======
                var ls = structured.landSuitability;
                var desertReasons = [];
                if ((ls.ndvi_max || 0) < 0.20) desertReasons.push('NDVI منخفض جداً');
                if ((ls.bsi_mean || 0) > 0.10) desertReasons.push('BSI مرتفع (جفاف)');
                if ((ls.ndvi_range || 0) < 0.15) desertReasons.push('تذبذب بصري منخفض (لا يوجد نمو)');
                if ((ls.albedo_mean || 0) > 0.15) desertReasons.push('بياض عالٍ (صحراء)');
                if ((ls.ndvi_stdDev || 0) < 0.05) desertReasons.push('تشتت NDVI منخفض (جرداء)');

                var lsVegProb = (ls.crops_prob || 0) + (ls.grass_prob || 0);
                var isDesertDetected = false;

                // 🔧 REFINEMENT: Only classify as desert if Dynamic World doesn't strongly think it's vegetation
                // AND it passes the NDVI agricultural guard (if ndvi_max > 0.25, it's NOT desert)
                if (lsVegProb < 0.3 && !result.is_agri_guard) {
                    isDesertDetected = (desertReasons.length >= 3) || ((ls.bare_prob || 0) > 0.6 && (ls.ndvi_max || 0) < 0.20);
                }

                var isUrbanDetected = ((ls.built_prob || 0) > 0.35) || ((ls.ndbi_mean || 0) > 0.1 && (ls.built_prob || 0) > (ls.crops_prob || 0));

                if (isUrbanDetected) isDesertDetected = false; // logic parity

                structured.isDesert = isDesertDetected;
                structured.isUrban = isUrbanDetected;
                structured.desertReasons = desertReasons;

                updateLoadingStatus('✅ تم التحليل بنجاح', 100);
                renderFullReport(structured, cropType, lat, lng, bufferSize, startDate, endDate, ndviArr || [], dateArr || [], isDesertDetected, isUrbanDetected, isNotPlanted);
            });
        });
    });

    // Map Visualization
    var optCol = getS2Collection(startDate, endDate, farmArea);
    var ndvi = indicesDict['NDVI'](optCol.median().clip(farmArea));
    addEELayer(ndvi, { min: 0, max: 0.8, palette: ['red', 'yellow', 'green', 'darkgreen'] }, 'NDVI - الحالة الخضرية');
}

// ----------------------------------------------------------------
// HELPER FUNCTIONS FOR FARMER REPORT (Full Parity with sage.js)
// ----------------------------------------------------------------

// safeFormat is defined globally at the top of the file.

function cardTitle(emoji, title) {
    return '<div style="font-weight:700;font-size:14px;color:#333;padding:10px 0 4px;border-bottom:2px solid #4CAF50;margin:12px 0 6px;">' + emoji + ' ' + title + '</div>';
}

function statRow(label, value, color, note) {
    return '<div style="display:flex;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;">' +
        '<span style="font-size:12px;font-weight:600;min-width:130px;">' + label + '</span>' +
        '<span style="font-size:13px;font-weight:700;color:' + (color || '#333') + ';flex:1;">' + value + '</span>' +
        (note ? '<span style="font-size:10px;color:#888;font-style:italic;max-width:140px;">' + note + '</span>' : '') +
        '</div>';
}

function classifySalinity(ecVal) {
    if (ecVal > 32) return { level: '💀 سبخة ملحية نشطة', color: '#880E4F', tolerance: 'أرض غير صالحة زراعياً' };
    if (ecVal > 16) return { level: '☠️ شديدة الملوحة جداً', color: '#B71C1C', tolerance: 'غير صالحة للزراعة التقليدية' };
    if (ecVal > 8) return { level: '🔴 شديدة الملوحة', color: '#D32F2F', tolerance: 'محاصيل شديدة التحمل فقط (الشعير، النخيل)' };
    if (ecVal > 4) return { level: '🟠 متوسطة الملوحة', color: '#F57C00', tolerance: 'محاصيل متوسطة التحمل (القطن، البنجر)' };
    if (ecVal > 2) return { level: '🟡 طفيفة الملوحة', color: '#FBC02D', tolerance: 'معظم المحاصيل ما عدا الحساسة' };
    return { level: '✅ تربة عذبة', color: '#388E3C', tolerance: 'جميع المحاصيل' };
}

// assessPestRisk: Uses airTemp (air temperature) NOT LST (land surface temp)
// airTemp is ~15-35°C, LST can be 30-60°C — confusing them causes wrong alerts
function assessPestRisk(cropType, rhVal, airTempVal) {
    var isWheat = (cropType.indexOf('قمح') > -1 || cropType.indexOf('Wheat') > -1);
    var isPotato = (cropType.indexOf('بطاطس') > -1 || cropType.indexOf('Potato') > -1);
    var isTomato = (cropType.indexOf('طماطم') > -1 || cropType.indexOf('Tomato') > -1);

    // sage.js line 5786-5999: Exact thresholds
    if (isWheat && rhVal > 60 && airTempVal >= 15 && airTempVal <= 25) {
        return { risk: '🔴 خطر داهم (الصدأ الأصفر)', color: '#D32F2F', msg: 'رطوبة جوية عالية (' + rhVal.toFixed(0) + '%) وحرارة معتدلة: بيئة مثالية للصدأ.' };
    }
    if (isWheat && rhVal > 50 && airTempVal > 25) {
        return { risk: '🟠 خطر متوسط (صدأ الساق/الأوراق)', color: '#F57C00', msg: 'الرطوبة تدعم نمو الفطريات.' };
    }
    if (isPotato && rhVal > 85 && airTempVal >= 10 && airTempVal <= 20) {
        return { risk: '🔴 خطر الندوة المتأخرة (كارثي)', color: '#D32F2F', msg: 'رطوبة جوية مشبعة! يجب الرش الوقائي فوراً.' };
    }
    if (isPotato && rhVal > 70) {
        return { risk: '🟠 خطر الندوة المبكرة', color: '#F57C00', msg: 'الرطوبة عالية، افحص الأوراق السفلية.' };
    }
    if (isTomato && rhVal > 80 && airTempVal < 20) {
        return { risk: '🔴 خطر الندوة المتأخرة', color: '#D32F2F', msg: 'الجو البارد والرطب مثالي للندوة المتأخرة.' };
    }
    if (airTempVal > 30 && rhVal < 40) {
        return { risk: '🟠 خطر العنكبوت الأحمر', color: '#F57C00', msg: 'الجو حار وجاف (' + rhVal.toFixed(0) + '%)، مثالي للعنكبوت الأحمر.' };
    }
    return { risk: '✅ منخفضة', color: '#388E3C', msg: 'الظروف الجوية (حرارة ورطوبة) مستقرة.' };
}

function getExpertNote(cropType, month) {
    var isWheat = (cropType.indexOf('قمح') > -1 || cropType.indexOf('Wheat') > -1);
    var isPotato = (cropType.indexOf('بطاطس') > -1 || cropType.indexOf('Potato') > -1);
    var isTomato = (cropType.indexOf('طماطم') > -1 || cropType.indexOf('Tomato') > -1);
    var isMaize = (cropType.indexOf('ذرة') > -1 || cropType.indexOf('Maize') > -1);

    if (isWheat) {
        if (month === 2) return 'القمح في مرحلة طرد السنابل. تجنب العطش تماماً، أضف سلفات بوتاسيوم (10 كجم رشاً) لزيادة الوزن.';
        if (month === 3) return 'مرحلة امتلاء الحبوب. احذر من الري وقت الرياح الشديدة لتجنب الرقاد.';
        if (month === 11 || month === 12) return 'مرحلة الإنبات والتفريع. تأكد من جرعة النشادر التنشيطية.';
    }
    if (isPotato) {
        if (month === 10 || month === 11) return 'عروة البطاطس النيلية. ركز على الوقاية من الندوة المتأخرة بسبب الرطوبة.';
        if (month === 12 || month === 1) return 'صب الدرنات. الاهتمام بالتسميد البوتاسي والري المنتظم.';
    }
    if (isTomato) return 'احذر من تذبذب الري لتجنب عفن طرف السرة. التسميد الكالسي ضروري.';
    if (isMaize && month >= 6 && month <= 8) return 'مرحلة التزهير وتكوين الكوز. احتياج مائي عالٍ جداً، احذر من العطش.';
    return 'تابع الري المنتظم وراقب حالة المحصول. استشر المرشد الزراعي عند الحاجة.';
}

function calculateIrrigation_Expert(result, cropType, startDate, endDate) {
    var etVal = safeGet(result, 'et', 'ET', 5.0);
    var precipVal = safeGet(result, 'precip', 'Precipitation', 0);
    var month = result.currentMonth || (new Date(endDate).getMonth() + 1);

    // Kc Table (FAO-56)
    var kcTable = {
        'قمح': 1.15, 'ذرة': 1.20, 'أرز': 1.20, 'قطن': 1.15, 'قصب': 1.25,
        'بطاطس': 1.15, 'طماطم': 1.15, 'فول': 1.15, 'برسيم': 0.95, 'بنجر': 1.20,
        'بصل': 1.05, 'خيار': 1.00, 'نخيل': 0.90, 'Wheat': 1.15, 'Maize': 1.20
    };
    var kc = 1.0;
    for (var k in kcTable) { if (cropType.indexOf(k) > -1) { kc = kcTable[k]; break; } }

    // ETo fallbacks — FAO-56 Penman-Monteith Egypt calibration (matching sage.js line 6156)
    var etoFallbacks = [2.5, 3.0, 4.5, 6.0, 7.5, 8.5, 9.0, 8.0, 6.5, 5.0, 3.5, 2.5];
    var eto = etVal;
    if (eto < 1.5 || isNaN(eto)) eto = etoFallbacks[Math.max(0, Math.min(11, month - 1))];

    var etc = eto * kc;
    var d1 = new Date(startDate); var d2 = new Date(endDate);
    var daysDiff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    var precipDaily = precipVal / daysDiff;
    var effectiveRainDaily = precipDaily * 0.8;
    var netIRR = Math.max(0, etc - effectiveRainDaily);
    if (netIRR < 0.5 && effectiveRainDaily < 1.0) netIRR = etc * 0.5;

    // Monthly calculation (matching sage.js)
    var m3PerFeddanMonth = netIRR * 4.2 * 30; // approx monthly
    var m3PerFeddanDay = netIRR * 4.2;

    var note = (netIRR > 5) ? '⚠️ احتياج ري مرتفع' : (netIRR > 0 ? '💧 احتياج ري معتدل/منخفض' : '✅ لا يحتاج ري');
    return { eto: eto, kc: kc, etc: etc, netIrr: netIRR, m3PerFeddanDay: m3PerFeddanDay, m3PerFeddanMonth: m3PerFeddanMonth, effectiveRainDaily: effectiveRainDaily, daysDiff: daysDiff, note: note };
}

function calculateLeaching_Professional(ecReal, cropType, netIrr, olmTexture) {
    // Crop EC tolerance (FAO) - Full parity with sage.js
    var cropEcThreshold = {
        'قمح': { ecMax: 6.0, yieldLoss10: 7.4, nameEn: 'Wheat' },
        'ذرة': { ecMax: 1.7, yieldLoss10: 2.5, nameEn: 'Maize' },
        'أرز': { ecMax: 3.0, yieldLoss10: 3.8, nameEn: 'Rice' },
        'قطن': { ecMax: 7.7, yieldLoss10: 9.6, nameEn: 'Cotton' },
        'قصب': { ecMax: 1.7, yieldLoss10: 3.4, nameEn: 'Sugarcane' },
        'بطاطس': { ecMax: 1.7, yieldLoss10: 2.5, nameEn: 'Potatoes' },
        'طماطم': { ecMax: 2.5, yieldLoss10: 3.5, nameEn: 'Tomato' },
        'برسيم': { ecMax: 2.0, yieldLoss10: 3.4, nameEn: 'Clover' },
        'بنجر': { ecMax: 7.0, yieldLoss10: 8.7, nameEn: 'Sugar Beet' },
        'شعير': { ecMax: 8.0, yieldLoss10: 10.0, nameEn: 'Barley' },
        'نخيل': { ecMax: 4.0, yieldLoss10: 6.8, nameEn: 'Date Palm' },
        'بصل': { ecMax: 1.2, yieldLoss10: 1.8, nameEn: 'Onion' }
    };

    var cropEC = { ecMax: 4.0, yieldLoss10: 5.5, nameEn: 'Default' };
    for (var k in cropEcThreshold) {
        if (cropType.indexOf(k) > -1) {
            cropEC = cropEcThreshold[k];
            break;
        }
    }

    var targetEC = cropEC.ecMax;
    var calculateLR = function (ecw) {
        var denom = (5 * targetEC) - ecw;
        if (denom <= 0) return 0.5;
        var lr = ecw / denom;
        return Math.min(0.5, Math.max(0, lr));
    };

    var lrNile = calculateLR(0.5);
    var lrMedium = calculateLR(1.5);
    var lrSalty = calculateLR(3.0);

    var grossNile = netIrr / Math.max(0.01, (1 - lrNile));
    var grossMedium = netIrr / Math.max(0.01, (1 - lrMedium));
    var grossSalty = netIrr / Math.max(0.01, (1 - lrSalty));

    // Reclamation leaching
    var leachFactor = 120;
    if (olmTexture && olmTexture.indexOf('Sand') > -1) leachFactor = 80;
    if (olmTexture && olmTexture.indexOf('Clay') > -1) leachFactor = 160;
    var reclamationM3 = (ecReal > targetEC) ? (ecReal - targetEC) * leachFactor : 0;

    // Yield loss
    var yieldLoss = 0;
    if (ecReal > targetEC) {
        var slopeB = 10 / Math.max(0.1, (cropEC.yieldLoss10 - targetEC));
        yieldLoss = Math.min(100, (ecReal - targetEC) * slopeB);
    }

    return {
        targetEC: targetEC,
        yieldLoss: yieldLoss,
        reclamationM3: reclamationM3,
        lr_nile: lrNile, lr_medium: lrMedium, lr_salty: lrSalty,
        // Extra leaching water per month per feddan (beyond normal irrigation)
        extra_nile_m3: Math.max(0, (grossNile - netIrr)) * 4.2 * 30,
        extra_medium_m3: Math.max(0, (grossMedium - netIrr)) * 4.2 * 30,
        extra_salty_m3: Math.max(0, (grossSalty - netIrr)) * 4.2 * 30,
        // Gross daily water per feddan (including leaching fraction)
        grossNileDaily: grossNile * 4.2,
        grossMediumDaily: grossMedium * 4.2,
        grossSaltyDaily: grossSalty * 4.2,
        // Gross monthly = gross daily * 30
        grossNileMonthly: grossNile * 4.2 * 30,
        grossMediumMonthly: grossMedium * 4.2 * 30,
        grossSaltyMonthly: grossSalty * 4.2 * 30,
        netIrrDaily: netIrr * 4.2,
        netIrrMonthly: netIrr * 4.2 * 30,
        cropNameEn: cropEC.nameEn
    };
}

// ----------------------------------------------------------------
// RENDER FULL FARMER REPORT (All Sections — Full Parity with sage.js)
// ----------------------------------------------------------------
function renderFullReport(result, cropType, lat, lng, bufferSize, startDate, endDate, ndviArr, dateArr, isBarren, isUrban, isNotPlanted) {
    var farmPoint = ee.Geometry.Point([lng, lat]);
    var farmArea = farmPoint.buffer(bufferSize);

    // safeGet is now global
    var ndviVal = safeGet(result, 'ndvi', 'NDVI', 0);
    var eviVal = safeGet(result, 'evi', 'EVI', 0);
    var ndmiVal = safeGet(result, 'ndmi', 'NDMI', 0);
    var vhiVal = safeGet(result, 'vhi', 'VCI', 50);
    var gciVal = safeGet(result, 'gci', 'GCI', 0);
    var rhVal = safeGet(result, 'rh', 'RH', 40);
    var airTempVal = safeGet(result, 'airTemp', 'air_temp_C', 25);
    var windSpeedVal = safeGet(result, 'windSpeed', 'WindSpeed', 3);
    var bsiVal = safeGet(result, 'bsi', 'BSI', 0);
    var smVal = safeGet(result, 'sm', 'sm_topsoil_m3m3', 0.2);
    var smRootVal = safeGet(result, 'smRoot', 'sm_rootzone_m3m3', 0.2);
    var lstVal = safeGet(result, 'lst', 'LST', 25);
    var etVal = safeGet(result, 'et', 'ET', 5.0);
    var precipVal = safeGet(result, 'precip', 'Precipitation', 0);
    var currentMonth = safeGet(result, 'currentMonth', null, (new Date(endDate).getMonth() + 1));
    var si3Val = safeGet(result, 'si3_check', 'SI3_Check', 0);
    var ecRealVal = safeGet(result, 'ec_v25', 'EC_V25', 1.0); // V2.5 — matches sage.js

    // 🛑 EXPERT REFINEMENT: Smarter fallback for bare soil
    if (ecRealVal <= 1.2 && ndviVal < 0.20 && bsiVal > 0.1) {
        if (si3Val > 0.05) {
            ecRealVal = 2.0 + (si3Val * 30);
        } else {
            ecRealVal = Math.max(ecRealVal, 1.2 + (bsiVal * 2));
        }
    }

    var d1 = new Date(startDate);
    var d2 = new Date(endDate);
    var daysDiff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));

    // Composite Drought Risk (1 = Dry, 0 = Wet)
    var ndmiNorm = Math.min(1, Math.max(0, (ndmiVal + 0.2) / 0.6));
    var smNorm = Math.min(1, Math.max(0, (smVal - 0.05) / 0.35));
    var droughtRiskVal = 1 - ((ndmiNorm * 0.4) + (smNorm * 0.6));

    // Health Score with capping
    var healthScore = vhiVal;
    if (ndviVal > 0.15) {
        var ndviScore = Math.min(100, Math.max(0, (ndviVal - 0.1) / 0.7 * 100));
        healthScore = (ndviScore * 0.3) + (vhiVal * 0.7);
        if (ecRealVal > 8) healthScore = Math.min(healthScore, 30);
        else if (ecRealVal > 4) healthScore = Math.min(healthScore, 50);
        if (droughtRiskVal > 0.6) healthScore = Math.min(healthScore, 55);
    }
    var healthColor = healthScore > 75 ? '#2E7D32' : (healthScore > 40 ? '#F9A825' : '#D32F2F');
    var healthStatus = healthScore > 75 ? 'ممتازة' : (healthScore > 50 ? 'جيدة/متوسطة' : 'ضعيفة/مجهدة');
    var si3Val = safeGet(result, 'si3_check', 'SI3_Check', 0);
    var gddVal = (result.gdd !== undefined && !isNaN(result.gdd)) ? Number(result.gdd) : 0;
    var month = new Date(endDate).getMonth() + 1;

    // === IMPROVED BENCHMARK: Egypt agriculture seasonal NDVI averages (from FAO-GEE calibration) ===
    // Values calibrated from sage.js governorate-level NDVI statistics for Egyptian agricultural zones
    var egyptSeasonalBenchmarks = {
        winter: 0.38, // Nov-Mar: Wheat, clover, vegetables
        spring: 0.42, // Apr-May: Active growing season
        summer: 0.35, // Jun-Sep: Heat stress, water-intensive crops
        autumn: 0.30  // Oct: Post-harvest, early planting
    };
    var benchmarkFromDB;
    if (month >= 11 || month <= 3) benchmarkFromDB = egyptSeasonalBenchmarks.winter;
    else if (month <= 5) benchmarkFromDB = egyptSeasonalBenchmarks.spring;
    else if (month <= 9) benchmarkFromDB = egyptSeasonalBenchmarks.summer;
    else benchmarkFromDB = egyptSeasonalBenchmarks.autumn;

    // If server returned a real benchmark value, use it; otherwise use seasonal lookup
    var benchmarkVal = (result.benchmark !== undefined && !isNaN(result.benchmark) && Number(result.benchmark) > 0.05)
        ? Number(result.benchmark)
        : benchmarkFromDB;

    // SoilGrids details
    var olmClay = safeGet(result, 'olmSoil', 'Clay', 30);
    var olmSand = safeGet(result, 'olmSoil', 'Sand', 40);
    var olmPH = safeGet(result, 'olmSoil', 'pH', 8.0);
    var olmSOC = (safeGet(result, 'olmSoil', 'SOC', 10) / 10); // SOC is often in dg/kg
    var olmSilt = safeGet(result, 'olmSoil', 'Silt', 30);
    var olmCEC = safeGet(result, 'olmSoil', 'CEC', 0);
    var olmBD = safeGet(result, 'olmSoil', 'BD', 1.5);
    var olmPAW = safeGet(result, 'olmSoil', 'PAW', 0.1);
    var olmN = safeGet(result, 'nitrogen', 'Nitrogen', 0);
    var olmTexture = getTextureName(olmClay, olmSand);

    // 2. LOGIC & ANALYTICS
    var salClass = classifySalinity(ecRealVal);
    var growthStage = detectGrowthStage(ndviVal, startDate, endDate, cropType);

    // Diagnostic Minerals (for report parity)
    var clayRatioVal = safeGet(result, 'clayRatio', 'ClayRatio', 0);
    var ironVal = safeGet(result, 'ironOxide', 'IronOxide', 0);
    var gypVal = safeGet(result, 'gypsumIndex', 'GypsumIndex', 0);
    var carbVal = safeGet(result, 'carbonateIndex', 'CarbonateIndex', 0);

    // Detailed Soil Type construction (matching sage.js)
    var specialConditions = [];
    if (gypVal > 0.2) specialConditions.push('جبسي');
    if (carbVal > 1.3) specialConditions.push('كلسي (كربوناتي)');
    if (ironVal > 2.5) specialConditions.push('أكاسيد حديد');
    var finalTexture = (olmTexture && olmTexture !== 'Unknown') ? olmTexture : 'رملي صحراوي (Desert Sand)';
    var soilDetailedType = specialConditions.length > 0 ? 'تربة ' + finalTexture + ' (' + specialConditions.join(' + ') + ')' : 'تربة ' + finalTexture;

    // GDD Thresholds for progress (matching ee-computations_v5.js)
    var gddThresholds = {
        'Wheat': 1600, 'Maize': 2400, 'Rice': 2200,
        'Cotton': 2800, 'Sugarcane': 4500, 'Potato': 1800, 'Tomato': 1500, 'General Crop': 2000
    };
    var tGDD = gddThresholds['General Crop'];
    var keysGDD = Object.keys(gddThresholds);
    for (var iG = 0; iG < keysGDD.length; iG++) {
        if (cropType.toLowerCase().indexOf(keysGDD[iG].toLowerCase()) > -1) {
            tGDD = gddThresholds[keysGDD[iG]];
            break;
        }
    }
    var harvestProgress = Math.min(100, (gddVal / tGDD) * 100);
    var performanceGap = ((ndviVal / Math.max(0.01, benchmarkVal)) * 100 - 100);
    var gapColor = performanceGap >= 0 ? '#2E7D32' : '#D32F2F';

    // Anomalies
    var anomalyPixels = safeGet(result, 'anomalies', 'sum', 0);
    var farmSizeM2 = (window._drawMode && window._drawnPolygonArea) ? window._drawnPolygonArea : (bufferSize * bufferSize * Math.PI);
    // Assumes each anomaly pixel is roughly 10x10 = 100m^2 (Sentinel-2 resolution)
    var anomalyArea = anomalyPixels * 100;
    var anomalyPercent = Math.min(100, (anomalyArea / farmSizeM2) * 100);

    // Crop identification flags (matching sage.js)
    var isWheat = (cropType.indexOf('قمح') > -1 || cropType.indexOf('Wheat') > -1);
    var isPotato = (cropType.indexOf('بطاطس') > -1 || cropType.indexOf('Potato') > -1);
    var isTomato = (cropType.indexOf('طماطم') > -1 || cropType.indexOf('Tomato') > -1);
    var isMaize = (cropType.indexOf('ذرة') > -1 || cropType.indexOf('Maize') > -1);
    var csiVal = Math.min(1, ecRealVal / 10);
    // isLiveBarren: require BOTH conditions (prevents false positive from roads/edges inside buffer)
    // 🛑 TUNING FOR DESERT PIVOTS: Desert farms often have high BSI and lower NDVI early on.
    // We adjust the thresholds so it only triggers if it's REALLY dead sand (NDVI < 0.12, BSI > 0.35, VegProb < 0.20)
    var lsCropProb = safeGet(result, 'landSuitability', 'crops_prob', 0);
    var lsVegProb = lsCropProb + safeGet(result, 'landSuitability', 'grass_prob', 0);
    var isLiveBarren = (ndviVal < 0.12) && (bsiVal > 0.35) && (lsVegProb < 0.20);
    var isInvalidForCrop = isBarren || isUrban || isLiveBarren || isNotPlanted;

    // Expert Recommendations
    var yieldEst = (typeof estimateYield_Simple === 'function') ? estimateYield_Simple(ndviVal, cropType) : 'غير متوفر';
    var irrig = calculateIrrigation_Expert(result, cropType, startDate, endDate);
    var leach = calculateLeaching_Professional(ecRealVal, cropType, irrig.netIrr, olmTexture);
    var pest = assessPestRisk(cropType, rhVal, lstVal);
    var seasonalAdvice = getExpertNote(cropType, month);

    // Fertilizer Plan with multipliers
    var nPerformanceMult = 1.0;
    if (performanceGap < -10) nPerformanceMult = 1.2;
    else if (performanceGap > 15) nPerformanceMult = 0.9;

    var cropReqs = {
        'قمح': { N: 75, P: 15, K: 24, note: 'عند التفريع' },
        'ذرة': { N: 120, P: 30, K: 24, note: '3 دفعات' },
        'أرز (Rice)': { N: 60, P: 15, K: 0, note: 'يفضل سلفات النشادر' },
        'قطن (Cotton)': { N: 60, P: 22, K: 24, note: 'يحتاج توازن بين النمو الخضري والثمري' },
        'قصب السكر': { N: 180, P: 45, K: 48, note: 'احتياجات سمادية ضخمة' },
        'بطاطس': { N: 150, P: 60, K: 96, note: 'لصب الدرنات' },
        'طماطم (Tomato)': { N: 100, P: 45, K: 80, note: 'الكالسيوم ضروري جداً مع البوتاسيوم' },
        'بصل': { N: 80, P: 30, K: 48, note: 'يحتاج بورون لرش الورق' }
    };
    var fert = { N: 60, P: 30, K: 24, note: 'كميات تقريبية عامة' }; // default
    var baseC = cropType.split(' ')[0];
    for (var fKey in cropReqs) {
        if (fKey.indexOf(baseC) > -1 || cropType.indexOf(fKey) > -1) {
            fert = JSON.parse(JSON.stringify(cropReqs[fKey]));
            break;
        }
    }
    // Multiply logic removed from here as it relies on proper UI rendering.






    // 3. BUILD REPORT HTML
    var html = '<button class="btn btn-back mb-16" onclick="buildFarmerMode()">🔙 رجوع للإدخال</button>';

    // 🎨 UI HELPERS (Simulated for HTML)
    html += '<div style="font-weight:bold;color:black;">═══════════════════════════════════════</div>';
    html += '<div style="font-weight:bold;font-size:20px;color:black;text-align:center;width:100%;">🌾 تقرير المزرعة الذكي</div>';
    html += '<div style="font-weight:bold;color:black;">═══════════════════════════════════════</div>';

    var infoBox = '<div style="background-color:#E8F5E9;padding:8px;margin:10px 0;border-radius:8px;">' +
        '<div style="font-size:11px;">📍 الموقع: ' + lat.toFixed(4) + '°N, ' + lng.toFixed(4) + '°E</div>' +
        '<div style="font-size:11px;">🌱 المحصول: ' + cropType + '</div>' +
        '</div>';
    html += infoBox;

    // 🚦 TRAFFIC LIGHT
    var trafficLabel, trafficBg, trafficColor;
    if (ecRealVal > 8 || (ndviVal < 0.1 && bsiVal > 0.3)) {
        trafficLabel = '🔴 حالة حرجة — تحتاج تدخل فوري';
        trafficBg = '#FFCDD2'; trafficColor = '#B71C1C';
    } else if (ecRealVal > 4 || ndviVal < 0.25 || droughtRiskVal > 0.7) {
        trafficLabel = (droughtRiskVal > 0.7) ? '🟡 تنبيه: إجهاد مائي حاد (أرض جافة)' : '🟡 تحتاج انتباه — اتبع التوصيات';
        trafficBg = '#FFF9C4'; trafficColor = '#F57F17';
    } else {
        trafficLabel = '🟢 أرضك بحالة جيدة — استمر في المتابعة';
        trafficBg = '#C8E6C9'; trafficColor = '#1B5E20';
    }
    html += '<div style="font-weight:bold;font-size:16px;color:' + trafficColor + ';background-color:' + trafficBg + ';padding:10px;margin:5px 0;text-align:center;border-radius:8px;width:100%;box-sizing:border-box;">' + trafficLabel + '</div>';

    // 📅 TIMESTAMP
    var nowStr = (function () { var n = new Date(); return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2); })();
    html += '<div style="background-color:#E3F2FD;padding:6px;margin:3px 0;border-radius:6px;">' +
        '<div style="font-size:10px;color:#1565C0;">📅 تاريخ التحليل: ' + nowStr + ' | 🛰️ الفترة: ' + startDate + ' → ' + endDate + '</div>' +
        '<div style="font-size:10px;color:#1565C0;">📍 الإحداثيات: ' + lat.toFixed(5) + '°N, ' + lng.toFixed(5) + '°E | 📐 المساحة: ' + bufferSize + 'm buffer</div>' +
        '</div>';

    // 💧 IRRIGATION ESTIMATE
    var isSummer = (month >= 5 && month <= 9);
    var irrigQuickNote = '';
    var irrigQuickColor = '#0277BD';
    if (olmClay !== null) {
        if (olmClay >= 40) {
            irrigQuickNote = isSummer ? '💧 تربة طينية + صيف → ري كل 5-7 أيام' : '💧 تربة طينية + شتاء → ري كل 12-14 يوم';
        } else if (olmClay >= 28) {
            irrigQuickNote = isSummer ? '💧 تربة متوسطة الثقل + صيف → ري كل 4-6 أيام' : '💧 تربة متوسطة الثقل + شتاء → ري كل 10 أيام';
        } else if (olmSand !== null && olmSand >= 70) {
            irrigQuickNote = isSummer ? '💧 تربة رملية + صيف → ري كل 2-3 أيام' : '💧 تربة رملية + شتاء → ري كل 4-5 أيام';
        } else {
            irrigQuickNote = isSummer ? '💧 تربة متوسطة + صيف → ري كل 3-5 أيام' : '💧 تربة متوسطة + شتاء → ري كل 7-10 أيام';
        }
    } else {
        irrigQuickNote = isSummer ? '💧 ري صيفي → كل 3-5 أيام' : '💧 ري شتوي → كل 7-10 أيام';
    }
    if (ecRealVal > 4) {
        irrigQuickNote += ' ⚠️ (ملوحة → زد كمية الري 20-30%)';
        irrigQuickColor = '#E65100';
    }
    html += '<div style="font-size:12px;font-weight:bold;color:' + irrigQuickColor + ';background-color:#E0F7FA;padding:8px;margin:3px 0;border-radius:6px;width:100%;box-sizing:border-box;">' + irrigQuickNote + '</div>';

    // 1️⃣ OVERALL STATUS
    var statusTitle = isInvalidForCrop ? 'حالة الأرض' : 'الحالة العامة للمحصول';
    var statusEmoji = isInvalidForCrop ? '🗺️' : '🎯';
    html += '<div style="font-weight:bold;font-size:16px;color:black;background-color:#f0f0f0;padding:8px;text-align:center;margin:15px 0 5px 0;border:1px solid #ccc;width:100%;box-sizing:border-box;">' + statusEmoji + ' ' + statusTitle + '</div>';

    var healthStatus = (isInvalidForCrop) ? 'أرض غير مستغلة / صحراوية' : (healthScore > 75 ? 'ممتازة' : (healthScore > 55 ? 'جيدة' : (healthScore > 35 ? 'متوسطة' : 'ضعيفة')));
    var healthColor = (isInvalidForCrop) ? '#D2691E' : (healthScore > 75 ? '#2E7D32' : (healthScore > 55 ? '#43A047' : (healthScore > 35 ? '#F57C00' : '#D32F2F')));
    var healthLabel = isInvalidForCrop ? 'تصنيف المنطقة:' : 'مؤشر الصحة العام:';
    var healthValue = isInvalidForCrop ? '---' : Math.round(healthScore) + '%';

    html += '<div style="padding:6px;margin:2px 0;background-color:#f9f9f9;border-radius:4px;display:flex;align-items:center;">' +
        '<div style="font-size:13px;font-weight:bold;width:140px;">' + healthLabel + '</div>' +
        '<div style="font-size:18px;font-weight:900;color:' + healthColor + ';margin:0 10px;">' + healthValue + '</div>' +
        '<div style="font-size:12px;color:' + healthColor + ';padding:2px 8px;background-color:white;border:1px solid ' + healthColor + ';border-radius:12px;">' + healthStatus + '</div>' +
        '</div>';

    // ✨ NEW: Raw NDVI Value
    var ndviColor = ndviVal > 0.6 ? '#2E7D32' : (ndviVal > 0.3 ? '#F9A825' : '#D32F2F');
    html += '<div style="padding:6px;margin:2px 0;background-color:#f9f9f9;border-radius:4px;display:flex;align-items:center;">' +
        '<div style="font-size:13px;font-weight:bold;width:140px;">مؤشر الخضار (NDVI):</div>' +
        '<div style="font-size:18px;font-weight:900;color:' + ndviColor + ';margin:0 10px;">' + ndviVal.toFixed(2) + '</div>' +
        '<div style="font-size:10px;color:#777;padding-top:4px;">(القيمة من -1 إلى 1)</div>' +
        '</div>';

    // 🛑 PIVOT SECTION
    var soilIdDummy = 'tech-soil-detail';
    var cropSugIdDummy = 'crop-suit-detail';

    if (isInvalidForCrop) {
        var pivotTitle = isUrban ? '🏙️ تنبيه: منطقة عمرانية' : '🏜️ تنبيه: أرض غير مزروعة';
        var pivotColor = isUrban ? '#D32F2F' : '#D2691E';
        html += '<div style="font-weight:bold;font-size:16px;color:' + pivotColor + ';text-align:center;width:100%;margin-top:10px;">' + pivotTitle + '</div>';
        html += '<button class="btn btn-execute" style="width:100%;margin:10px 0;background-color:#2E8B57;" onclick="toggleSection(\'' + soilIdDummy + '\');toggleSection(\'' + cropSugIdDummy + '\')">🔍 عرض المحاصيل المناسبة (Suitability)</button>';
    }

    // 2️⃣ DYNAMIC FERTILIZER
    if (!isUrban) {
        if (!isInvalidForCrop) {
            html += '<div style="font-weight:bold;font-size:16px;color:black;background-color:#f0f0f0;padding:8px;text-align:center;margin:15px 0 5px 0;border:1px solid #ccc;width:100%;box-sizing:border-box;">🧪 توصيات التسميد (مخصص للمحصول)</div>';

            var nTotal = fert.N;
            if (olmSOC !== null && (olmSOC / 10) < 1) nTotal *= 1.15; // Adjusted SOC boost

            // Subtract available soil Nitrogen (olmN)
            // olmN is in units used by GEE collection (likely mg/kg), we treat it as units/feddan for simplicity or use a conversion factor
            // For now, subtract 50% of soil N to be conservative.
            var nAvailable = (olmN || 0) * 0.5;
            var nRec = Math.max(0, nTotal - nAvailable);

            // SPECIAL GUARD: Wheat in Heading Stage (February/March)
            var scheduleMsgInner = (month <= 2 || month >= 10) ? '🗓️ جدول التسميد: ركز الآن على الدفعات التنشيطية (النيتروجين).' : '🗓️ جدول التسميد: ركز الآن على دفعات التعمير وصب الثمار (البوتاسيوم).';

            if (isWheat && (month === 2 || month === 3)) {
                nRec = 0; // Stop Nitrogen to prevent lodging as ears emerge
                scheduleMsgInner = '🗓️ جدول التسميد: توقف عن النيتروجين الآن لضمان جودة السنابل ومنع الرقاد.';
            }

            var pRec = fert.P;
            if (olmPH !== null && olmPH > 8) pRec *= 1.25;
            var kRec = fert.K;

            // SCIENTIFIC K-BOOST (Based on Egypt Crop Calendar)
            if (isWheat && (month === 2 || month === 3)) {
                kRec *= 1.30; // 30% boost for Heading/Grain Fill
            } else if (isPotato && (month === 12 || month === 1)) {
                kRec *= 1.25; // 25% boost for Tuber Bulking
            }

            if (olmTexture && (olmTexture.indexOf('Sand') > -1)) kRec *= 1.2;

            html += statRow('النيتروجين (N):', Math.round(nRec) + ' وحدة/فدان', '#1B5E20', (nRec === 0 ? 'توقف عن التسميد الآزوكي الآن' : 'أضف ' + Math.round(nRec / 0.46) + ' كجم يوريا (' + fert.note + ')'));
            html += statRow('الفوسفور (P):', Math.round(pRec) + ' وحدة/فدان', '#F57F17', 'أضف ' + Math.round(pRec / 0.15) + ' كجم سوبر فوسفات');
            html += statRow('البوتاسيوم (K):', Math.round(kRec) + ' وحدة/فدان', '#7B1FA2', (isWheat && month === 2) ? 'أضف ' + Math.round(kRec / 0.48) + ' كجم سلفات بوتاسيوم (مهم للسنابل)' : 'أضف ' + Math.round(kRec / 0.48) + ' كجم سلفات بوتاسيوم');

            html += '<div style="font-size:11px;font-weight:bold;margin:5px 0;">' + scheduleMsgInner + '</div>';

        } else {
            html += '<div style="font-weight:bold;font-size:16px;color:black;background-color:#f0f0f0;padding:8px;text-align:center;margin:15px 0 5px 0;border:1px solid #ccc;width:100%;box-sizing:border-box;">🛠️ تجهيز وتحسين التربة (للاستصلاح)</div>';
        }

        if (olmSOC !== null && (olmSOC / 10) < 1.5) {
            html += '<div style="font-size:11px;color:#5D4037;background-color:#EFEBE9;padding:5px;border:1px solid #D7CCC8;">💡 توصية المادة العضوية: التربة فقيرة بالكربون. أضف 20 متر مكعب سماد بلدي أو كمبوست.</div>';
        }
        if (olmPH !== null && olmPH > 8.3 && ecRealVal > 4) {
            html += '<div style="font-size:11px;color:#455A64;background-color:#ECEFF1;padding:5px;">🛠️ معالجة القلوية: أضف 2-3 طن جبس زراعي للفدان لتحسين نفاذية التربة.</div>';
        }

        // Deep Expert Phenology
        if (!isInvalidForCrop) {
            var expertNote = '';
            if (isWheat) {
                if (month === 2) expertNote = '💡 تحليل الخبير: القمح في مرحلة "طرد السنابل". تجنب العطش تماماً، أضف سلفات بوتاسيوم (10 كجم رشاً) لزيادة الوزن.';
                else if (month === 3) expertNote = '💡 تحليل الخبير: مرحلة "امتلاء الحبوب". احذر من الري وقت الرياح الشديدة لتجنب الرقاد.';
                else if (month === 11 || month === 12) expertNote = '💡 تحليل الخبير: مرحلة "الإنبات والتفريع". تأكد من جرعة النشادر التنشيطية.';
            } else if (isPotato) {
                if (month === 10 || month === 11) expertNote = '💡 تحليل الخبير: عروة البطاطس النيلية. ركز على الوقاية من الندوة المتأخرة بسبب الرطوبة.';
                else if (month === 12 || month === 1) expertNote = '💡 تحليل الخبير: صب الدرنات. الاهتمام بالتسميد البوتاسي والري المنتظم.';
            } else if (isTomato) {
                expertNote = '💡 تحليل الخبير: احذر من تذبذب الري لتجنب "عفن طرف السرة". التسميد الكالسي ضروري الآن.';
            } else if (isMaize && (month >= 6 && month <= 8)) {
                expertNote = '💡 تحليل الخبير: مرحلة "التزهير وتكوين الكوز". احتياج مائي عالٍ جداً، احذر من العطش.';
            }

            if (expertNote !== '') {
                html += '<div style="font-size:11px;color:#1B5E20;font-style:italic;background-color:#F1F8E9;padding:5px;border:1px solid #C5E1A5;margin-top:5px;">' + expertNote + '</div>';
            }
        }

        if (lstVal > 35) {
            html += '<div style="font-size:11px;color:#E65100;font-style:italic;background-color:#FFF3E0;padding:5px;margin-top:5px;">⚠️ تنبيه إجهاد حراري: الحرارة عالية، لا تروِ في وقت الظهيرة إطلاقاً.</div>';
        }

        if (isInvalidForCrop) {
            var reclId = 'reclamation-detail';
            html += '<button class="btn btn-execute" style="width:100%;margin:10px 0;background-color:#795548;" onclick="toggleSection(\'' + reclId + '\')">🛠️ عرض خطة الاستصلاح الصحراوي</button>';
            html += '<div id="' + reclId + '" style="display:none;margin-top:10px;">' +
                '<div style="font-weight:bold;margin:10px 0 0 0;">📋 خطة الاستصلاح (مبدئية):</div>' +
                '<div style="font-size:12px;white-space:pre-wrap;">1. التسوية والتخطيط\n2. شبكة الري\n3. الإضافات الأولية (جبس + كمبوست)\n4. زراعة المحاصيل الكاسرة للملوحة</div>' +
                '</div>';
        }
    }

    // 3️⃣ EXPERT PEST & DISEASE RISK
    html += '<div style="font-weight:bold;font-size:16px;color:black;background-color:#f0f0f0;padding:8px;text-align:center;margin:15px 0 5px 0;border:1px solid #ccc;width:100%;box-sizing:border-box;">🐛 رصد الأخطار الحيوية (مناخ دقيق)</div>';
    var pestColorStr = 'green';
    if (isWheat && rhVal > 60 && airTempVal >= 15 && airTempVal <= 25) pestColorStr = 'red';
    var pestRiskStr = (pestColorStr === 'red') ? '🔴 خطر داهم (الصدأ الأصفر)' : '✅ منخفضة';
    var pestMsgStr = (pestColorStr === 'red') ? 'رطوبة جوية عالية (' + Math.round(rhVal) + '%) وحرارة معتدلة: بيئة مثالية للصدأ.' : 'الظروف الجوية (حرارة ورطوبة) مستقرة.';

    if (isWheat && rhVal > 50 && airTempVal > 25 && pestColorStr !== 'red') {
        pestRiskStr = '🟠 خطر متوسط (صدأ الساق/الأوراق)';
        pestMsgStr = 'الرطوبة تدعم نمو الفطريات.';
        pestColorStr = 'orange';
    } else if (isPotato) {
        if (rhVal > 85 && airTempVal >= 10 && airTempVal <= 20) {
            pestRiskStr = '🔴 خطر الندوة المتأخرة (كارثي)';
            pestMsgStr = 'رطوبة جوية مشبعة! يجب الرش الوقائي فوراً.';
            pestColorStr = 'red';
        } else if (rhVal > 70) {
            pestRiskStr = '🟠 خطر الندوة المبكرة';
            pestMsgStr = 'الرطوبة عالية، افحص الأوراق السفلية.';
            pestColorStr = 'orange';
        }
    } else if (isTomato) {
        if (rhVal > 80 && airTempVal < 20) {
            pestRiskStr = '🔴 خطر الندوة المتأخرة';
            pestColorStr = 'red';
        }
    }
    if (airTempVal > 30 && rhVal < 40) {
        pestRiskStr = '🟠 خطر العنكبوت الأحمر';
        pestMsgStr = 'الجو حار وجاف (' + Math.round(rhVal) + '%)، مثالي للعنكبوت.';
        pestColorStr = 'orange';
    }

    html += statRow('🌪️ حالة الجو:', 'رطوبة: ' + Math.round(rhVal) + '% | حرارة: ' + safeFormat(airTempVal, 1, '°م'), 'black');
    html += statRow('🦠 توقعات الأمراض:', pestRiskStr, pestColorStr);
    if (pestColorStr !== 'green') {
        html += '<div style="font-size:11px;color:#D32F2F;margin:0 0 10px 10px;font-weight:bold;">💡 نصيحة الخبير: ' + pestMsgStr + '</div>';
    }

    // 4️⃣ EXPERT CROP COMPATIBILITY CHECK
    var salinityClass = '';
    var salinityLabel = '';
    var salinityColor = '';

    if (csiVal < 0.20) { salinityClass = 'Non-Saline'; salinityLabel = '✅ غير مالحة'; salinityColor = 'green'; }
    else if (csiVal < 0.35) { salinityClass = 'Slightly Type'; salinityLabel = '⚠️ ملوحة خفيفة'; salinityColor = '#FFB300'; }
    else if (csiVal < 0.55) { salinityClass = 'Moderately Type'; salinityLabel = '⛔ ملوحة متوسطة'; salinityColor = '#FB8C00'; }
    else if (csiVal < 0.75) { salinityClass = 'High Type'; salinityLabel = '🛑 ملوحة مرتفعة'; salinityColor = '#D32F2F'; }
    else { salinityClass = 'Extreme Type'; salinityLabel = '☠️ ملوحة شديدة'; salinityColor = '#B71C1C'; }

    var toleranceMap = {
        'فراولة': 1, 'فاصوليا': 1, 'برتقال': 2, 'ذرة': 2, 'طماطم': 2,
        'قمح': 3, 'قطن': 3, 'شعير': 4, 'بنجر': 4, 'نخيل': 4
    };
    var currentClassIndex = 0;
    if (salinityClass.indexOf('Slightly') > -1) currentClassIndex = 1;
    if (salinityClass.indexOf('Moderately') > -1) currentClassIndex = 2;
    if (salinityClass.indexOf('High') > -1) currentClassIndex = 3;
    if (salinityClass.indexOf('Extreme') > -1) currentClassIndex = 4;

    var isCompatible = true;
    for (var tKey in toleranceMap) {
        if (cropType.indexOf(tKey) > -1) {
            if (currentClassIndex > toleranceMap[tKey]) isCompatible = false;
            break;
        }
    }

    if (!isCompatible) {
        html += '<div style="background-color:#D32F2F;padding:10px;margin:15px 0;">' +
            '<div style="font-weight:bold;font-size:18px;color:white;">⛔ تحذير خطير: غير متوافق!</div>' +
            '<div style="font-weight:bold;color:black;">التربة مصنفة: "' + salinityLabel + '"</div>' +
            '<div style="color:white;">محصول "' + cropType + '" لا يتحمل هذا المستوى من الأملاح.</div>' +
            '<div style="color:#C8E6C9;font-weight:bold;">💡 النصيحة: اختر الشعير أو البنجر أو النخيل.</div>' +
            '</div>';
    } else if (currentClassIndex > 0) {
        html += '<div style="font-size:11px;color:#F57C00;margin:5px 0;">⚠️ تنبيه ملوحة: التربة "' + salinityLabel + '" ولكن المحصول يتحملها.</div>';
    }

    // ─── Spraying Guide Logic ───
    var canSpray = windSpeedVal < 5;
    var sprayColor = canSpray ? 'green' : 'red';
    var sprayMsg = canSpray ? 'الرياح هادئة، مناسب للرش.' : 'الرياح شديدة، تجنب الرش لمنع الانجراف.';
    if (canSpray && airTempVal > 35) {
        canSpray = false;
        sprayColor = 'orange';
        sprayMsg = 'الحرارة عالية جداً، يفضل الرش في الصباح الباكر أو المساء.';
    }
    html += statRow('🚿 دليل الرش:', (canSpray ? 'مسموح' : 'ممنوع'), sprayColor, sprayMsg);

    // C. YIELD FORECAST
    if (typeof estimateYield_Simple === 'function' && !isInvalidForCrop && !isNotPlanted) {
        html += statRow('⚖️ الإنتاجية المتوقعة:', yieldEst, '#2E7D32', 'بناءً على الكثافة النباتية الحالية');
    }

    // 💧 FAO-56 CROP WATER REQUIREMENT
    if (!isUrban) {
        html += '<div style="font-weight:bold;font-size:16px;color:black;background-color:#f0f0f0;padding:8px;text-align:center;margin:15px 0 5px 0;border:1px solid #ccc;width:100%;box-sizing:border-box;">💧 الاحتياج المائي الفعلي (FAO-56)</div>';
        html += '<div style="font-weight:bold;color:#0277BD;margin:8px 0 4px 0;">━━━ 📊 الاحتياج المائي الصافي ━━━</div>';
        html += statRow('📅 لكل فدان/شهر:', safeFormat(irrig.m3PerFeddanDay * 30, 0, ' م³'), '#2E7D32');

        var irrInterpret = '';
        var irrInterpretColor = '#1B5E20';
        if (droughtRiskVal > 0.6) {
            irrInterpret = '⚠️ تحذير جفاف: الأرض جافة جداً! يفضل تقليل الفاصل الزمني أو زيادة كمية المياه.';
            irrInterpretColor = '#D32F2F';
        } else if (irrig.netIrr > 5) {
            irrInterpret = '🟠 احتياج مائي مرتفع — تأكد من كفاية المصدر.';
            irrInterpretColor = '#E65100';
        } else if (irrig.netIrr > 0) {
            irrInterpret = '🟢 احتياج مائي منخفض/متوسط — تابع ميعاد الري القادم.';
            irrInterpretColor = '#2E7D32';
        } else {
            irrInterpret = '✅ الأمطار كافية — لا حاجة للري حالياً.';
            irrInterpretColor = '#1B5E20';
        }
        html += '<div style="font-size:11px;font-weight:bold;color:' + irrInterpretColor + ';background-color:#E0F7FA;padding:8px;margin:5px 0;border-radius:6px;width:100%;box-sizing:border-box;">' + irrInterpret + '</div>';

        var dripSave = Math.round(irrig.m3PerFeddanDay * 30 * 0.35);
        html += '<div style="font-size:11px;color:#00695C;font-style:italic;margin:3px 0;">💡 نصيحة: الري بالتنقيط يوفر حوالي ' + dripSave + ' م³/فدان/شهر مقارنة بالري بالغمر.</div>';
    }

    // 8️⃣ LEACHING REQUIREMENT
    if (ecRealVal > 1.5) {
        html += '<div style="font-weight:bold;font-size:16px;color:black;background-color:#f0f0f0;padding:8px;text-align:center;margin:15px 0 5px 0;border:1px solid #ccc;width:100%;box-sizing:border-box;">🧂 إدارة الملوحة وغسيل التربة (محسّن)</div>';
        var ecStatusColor = (ecRealVal > 8) ? '#B71C1C' : ((ecRealVal > 4) ? '#E65100' : '#F57F17');
        var ecStatusLabel = (ecRealVal > 8) ? '🔴 شديدة' : ((ecRealVal > 4) ? '🟠 متوسطة' : '🟡 طفيفة');
        html += statRow('🧂 ملوحة التربة (ECe):', safeFormat(ecRealVal, 1, ' dS/m'), ecStatusColor, ecStatusLabel);

        var yieldLossColor = (leach.yieldLoss > 25) ? '#B71C1C' : ((leach.yieldLoss > 10) ? '#E65100' : ((leach.yieldLoss > 0) ? '#F57F17' : '#2E7D32'));
        html += statRow('🌱 حد تحمل المحصول (ECt):', safeFormat(leach.targetEC, 1, ' dS/m'), '#2E7D32', cropType);

        if (leach.yieldLoss > 0) {
            html += statRow('📉 فقد الإنتاجية المتوقع:', safeFormat(leach.yieldLoss, 0, '%'), yieldLossColor, 'بسبب الملوحة الحالية');
        } else {
            html += statRow('📈 حالة المحصول:', 'ضمن الحد الآمن ✅', '#2E7D32');
        }

        if (leach.reclamationM3 > 0) {
            html += '<div style="font-weight:bold;color:#D32F2F;margin:10px 0 2px 0;">🚜 متطلبات غسيل الاستصلاح (مرة واحدة):</div>';
            html += statRow('💧 كمية مياه الغسيل:', safeFormat(leach.reclamationM3, 0, ' م³/فدان'), '#D32F2F', 'تُضاف تدريجياً لخفض الملوحة');
        }

        html += '<div style="font-weight:bold;color:#0277BD;margin:10px 0 4px 0;">━━━ 💧 احتياجات الغسيل حسب مصدر المياه ━━━</div>';

        if (leach.lr_nile >= 0.45) html += statRow('💧 مياه النيل (0.5 dS/m):', '❌ غير مناسب', 'red', 'LR > 45%');
        else html += statRow('💧 مياه النيل (0.5 dS/m):', 'LR = ' + safeFormat(leach.lr_nile * 100, 0, '%') + ' | إجمالي: ' + safeFormat(leach.grossNileDaily, 0, ' م³/فدان/يوم'), '#1565C0', '+' + safeFormat(leach.extra_nile_m3 / 30, 0, ' م³ ماء إضافي للغسيل'));

        if (leach.lr_medium >= 0.45) html += statRow('💧 آبار متوسطة (1.5 dS/m):', '❌ غير مناسب', '#F9A825', 'LR > 45%');
        else html += statRow('💧 آبار متوسطة (1.5 dS/m):', 'LR = ' + safeFormat(leach.lr_medium * 100, 0, '%') + ' | إجمالي: ' + safeFormat(leach.grossMediumDaily, 0, ' م³/فدان/يوم'), '#F9A825', '+' + safeFormat(leach.extra_medium_m3 / 30, 0, ' م³ ماء إضافي للغسيل'));

        if (leach.lr_salty >= 0.45) html += statRow('💧 آبار مالحة (3.0 dS/m):', '❌ غير مناسب لهذا المحصول', 'red', 'LR > 45%');
        else html += statRow('💧 آبار مالحة (3.0 dS/m):', 'LR = ' + safeFormat(leach.lr_salty * 100, 0, '%') + ' | إجمالي: ' + safeFormat(leach.grossSaltyDaily, 0, ' م³/فدان/يوم'), '#D32F2F', '+' + safeFormat(leach.extra_salty_m3 / 30, 0, ' م³ ماء إضافي للغسيل'));

        html += '<div style="font-weight:bold;color:#0277BD;margin:10px 0 4px 0;">━━━ 📊 ملخص الميزانية المائية (شهري) ━━━</div>';
        html += statRow('🌱 احتياج المحصول (ETc):', safeFormat(irrig.etc * 30 * 4.2, 0, ' م³/فدان/شهر'), '#2E7D32');
        html += statRow('🌧️ تغطية الأمطار:', '-' + safeFormat((precipVal / daysDiff) * 0.8 * 30 * 4.2, 0, ' م³/فدان/شهر'), '#1565C0');
        html += statRow('💧 صافي الري:', safeFormat(irrig.netIrr * 30 * 4.2, 0, ' م³/فدان/شهر'), '#F57C00');
        html += statRow('🧂 مياه الغسيل الإضافية:', '+' + safeFormat(leach.extra_nile_m3, 0, ' م³/فدان/شهر'), '#00ACC1', 'مياه نيل (LR = ' + safeFormat(leach.lr_nile * 100, 0, '%)'));

        html += '<div style="color:#0277BD;">═══════════════════════════════════</div>';
        html += statRow('📦 إجمالي المياه المطلوبة:', safeFormat((Number(leach.grossNileDaily || 0) * 30), 0, ' م³/فدان/شهر'), '#0277BD', 'شاملة الغسيل الوقائي');

        if (leach.reclamationM3 > 0) {
            html += statRow('🚜 + غسيل استصلاحي:', safeFormat(leach.reclamationM3, 0, ' م³/فدان'), '#D32F2F', 'بدون ري (مرة واحدة)');
        }

        html += '<div style="font-weight:bold;color:#00695C;margin:10px 0 4px 0;">━━━ 📋 توصيات جدول الغسيل ━━━</div>';
        var leachSchedule = '';
        if (olmTexture && olmTexture.indexOf('Sand') > -1) {
            leachSchedule = '🏖️ تربة رملية: غسيل خفيف مع كل رية (التربة سريعة الصرف) — أضف 15-20% مياه إضافية كل رية.';
        } else if (olmTexture && olmTexture.indexOf('Clay') > -1) {
            leachSchedule = '🧱 تربة طينية: غسيل مكثف كل 2-3 أسابيع (الصرف بطيء) — رية غسيل مستقلة بضعف الكمية العادية.';
        } else {
            leachSchedule = '🌾 تربة متوسطة: غسيل كل أسبوع — أضف 20-30% مياه إضافية مع الري.';
        }
        html += '<div style="font-size:11px;color:#00695C;background-color:#E0F2F1;padding:6px;border-radius:4px;">' + leachSchedule + '</div>';

        if (ecRealVal > 8) {
            html += '<div style="font-size:11px;color:#B71C1C;font-weight:bold;background-color:#FFEBEE;padding:6px;border-radius:4px;margin:5px 0;">' +
                '⚠️ تحذير: الملوحة شديدة! يُنصح بعمل غسيل مكثف قبل الزراعة (3-4 ريات غسيل متتالية) مع إضافة ' + safeFormat(ecRealVal * 0.5, 1) + ' طن/فدان جبس زراعي.</div>';
        }
        html += '<div style="font-size:9px;color:#999;font-style:italic;margin:3px 0;">📝 المعادلة: LR = ECw / (5×ECt - ECw) | المرجع: FAO Irrigation & Drainage Paper 29, Rev.1</div>';
    }

    // 📥 EXPORT
    html += '<button class="btn btn-execute" style="width:100%;margin:10px 0;background-color:#444;" onclick="downloadFarmMap()">📥 تحميل خريطة المزرعة</button>';

    // 8️⃣ DETAILED SOIL REPORT (Interactive Toggle)
    var soilId = 'tech-soil-detail';
    html += '<div style="font-weight:bold;font-size:14px;color:black;background-color:#f0f0f0;padding:8px;border:1px solid #ccc;width:100%;box-sizing:border-box;margin:15px 0;cursor:pointer;" onclick="toggleSection(\'' + soilId + '\')">▸ التقرير التقني التفصيلي (للخبراء)</div>';
    html += '<div id="' + soilId + '" style="display:none;padding:12px;border:1px solid #eee;font-size:13px;line-height:1.7;background-color:#ffffff;">';
    // Section 1: Visual Diagnostics
    html += '<div style="font-weight:bold;color:#000;background:#f0f0f0;padding:4px;border:1px solid #ccc;margin-bottom:8px;">🏔️ تقرير التربة التفصيلي (ISRIC SoilGrids v2.0)</div>';
    html += '<div style="font-weight:bold;color:#000;margin-bottom:6px;">🌍 التكوين الأرضي: ' + soilDetailedType + '</div>';

    if (gypVal > 0.2) html += '<div style="font-size:11px;color:#555;margin:2px 0 2px 15px;">💎 تربة جبسية - تحتاج إلى معالجة خاصة</div>';
    if (carbVal > 1.3) html += '<div style="font-size:11px;color:#555;margin:2px 0 2px 15px;">💎 تربة كلسية - قد تحتاج تعديل pH</div>';
    if (ironVal > 2.5) html += '<div style="font-size:11px;color:#555;margin:2px 0 2px 15px;">⚠️ نسبة أكاسيد حديد مرتفعة</div>';

    // Section 2: Detailed Properties
    html += '<div style="margin-top:8px;">🔬 نسيج التربة (USDA): ' + classifyUSDATexture(olmClay, olmSand) + '</div>';
    html += '<div>🟤 الطين (Clay): ' + safeFormat(olmClay, 1, '%') + '</div>';
    html += '<div>🏖️ الرمل (Sand): ' + safeFormat(olmSand, 1, '%') + '</div>';
    html += '<div>🟤 الغرين (Silt): ' + safeFormat((100 - olmClay - olmSand), 1, '%') + '</div>';

    var phStatus = olmPH < 5.5 ? '🔴 حمضي جداً' : (olmPH < 6.5 ? '🟡 حمضي' : (olmPH < 7.5 ? '🟢 معتدل' : (olmPH < 8.5 ? '🟡 قلوي' : '🔴 قلوي جداً')));
    html += '<div style="color:#000;margin-top:4px;">🧪 درجة الحموضة (pH): ' + safeFormat(olmPH, 1) + ' (' + phStatus + ')</div>';

    html += '<div style="margin-top:4px;">⚡ السعة التبادلية (CEC): ' + safeFormat(olmCEC, 1, ' cmol/kg') + '</div>';
    html += '<div>⚖️ الكثافة الظاهرية (Bulk Density): ' + safeFormat(olmBD, 2, ' g/cm³') + '</div>';
    html += '<div>💧 الماء الميسر (PAW): ' + safeFormat((olmPAW * 100), 1, '%') + '</div>';

    // Section 3: Mineral Analysis
    html += '<div style="font-weight:bold;color:#000;margin-top:16px;margin-bottom:8px;">🔬 مؤشرات المعادن والأكاسيد (من الأقمار الصناعية)</div>';
    html += '<div style="color:#000;">🧪 نسبة الطين السطحية: ' + safeFormat(clayRatioVal, 2) + '</div>';
    html += '<div style="color:#000;">🔴 أكاسيد الحديد: ' + safeFormat(ironVal, 2) + '</div>';
    html += '<div style="color:#000;">💎 الجبس: ' + safeFormat(gypVal, 3) + '</div>';
    html += '<div style="color:#000;">💎 الكربونات: ' + safeFormat(carbVal, 2) + '</div>';
    html += '<div style="color:#000;">🏖️ مؤشر التربة الجرداء (BSI): ' + safeFormat(bsiVal, 3) + '</div>';

    html += '</div></div>';

    // 9?? CROP SUGGESTIONS
    var cropSugId = 'crop-suit-detail';
    html += '<div style="font-weight:bold;font-size:14px;color:black;background-color:#e8f5e9;padding:8px;border:1px solid #a5d6a7;width:100%;box-sizing:border-box;margin:5px 0;cursor:pointer;" onclick="toggleSection(\'' + cropSugId + '\')">▸ 9. المحاصيل المقترحة</div>';
    html += '<div id="' + cropSugId + '" style="display:none;padding:12px;border:1px solid #c8e6c9;font-size:13px;background-color:#f0fff0;">';

    var isSandy = (olmTexture && (olmTexture.indexOf('Sand') > -1)) || olmSand > 70;
    var isSaline = csiVal > 0.3 || ecRealVal > 4;
    var isAlkaline = olmPH > 8.0;

    var catAdded = false;
    if (isSaline) {
        html += '<div style="margin-bottom:8px;"><b>🌾 محاصيل تتحمل الملوحة:</b><br><span style="color:#555;font-size:12px;">البرسيم الحجازي، الشعير، بنجر السكر، الكينوا، نخيل البلح.</span></div>';
        catAdded = true;
    }
    if (isSandy) {
        html += '<div style="margin-bottom:8px;"><b>🍊 محاصيل الأراضي الرملية:</b><br><span style="color:#555;font-size:12px;">الموالح، الزيتون، الرمان، التين، الفول السوداني، الجوجوبا.</span></div>';
        catAdded = true;
    } else {
        html += '<div style="margin-bottom:8px;"><b>🌽 محاصيل الأراضي الطميية/الثقيلة:</b><br><span style="color:#555;font-size:12px;">القمح، الذرة، البرسيم المصري، القطن، قصب السكر، الخضروات الورقية.</span></div>';
        catAdded = true;
    }
    if (isAlkaline) {
        html += '<div style="margin-bottom:8px;"><b>🧪 محاصيل التربة القلوية:</b><br><span style="color:#555;font-size:12px;">القطن، الشعير، بعض أصناف القمح، البنجر.</span></div>';
        catAdded = true;
    }
    if (!catAdded || (!isSaline && !isSandy && !isAlkaline)) {
        html += '<div style="color:#1B5E20;font-weight:bold;">✅ معظم المحاصيل التقليدية مناسبة لمواصفات هذه التربة الممتازة.</div>';
    }
    html += '<div style="font-size:11px;color:#777;margin-top:8px;">💡 نصيحة: استشر مهندساً زراعياً لاختيار الصنف الأنسب لمناخ منطقتك.</div>';
    html += '</div></div>';

    // NDVI Chart
    html += '<div class="chart-container" style="margin-top:10px;">' +
        '<div style="font-weight:700;font-size:12px;margin-bottom:8px;">📈 منحنى الحالة الصحية (NDVI History)</div>' +
        '<div style="height:150px;"><canvas id="ndviChart"></canvas></div></div>';

    // Footer
    html += '<div style="padding:15px;text-align:center;">' +
        '<button class="btn btn-execute" style="width:100%;" onclick="downloadFarmMap()">📥 تحميل خريطة المزرعة</button>' +
        '<div style="font-size:10px;color:#999;margin-top:12px;">📝 تقرير استرشادي مبني على الذكاء الاصطناعي الجغرافي (Sentinel/GEE)</div>' +
        '</div>';

    setPanelContent(html);

    // Render NDVI chart
    if (dateArr && dateArr.length > 0) {
        setTimeout(function () {
            var ctx = document.getElementById('ndviChart');
            if (ctx && typeof Chart !== 'undefined') {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dateArr,
                        datasets: [{ label: 'NDVI', data: ndviArr, borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)', fill: true, tension: 0.3, pointRadius: 2 }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { min: 0, max: 1, ticks: { font: { size: 9 } } },
                            x: { ticks: { font: { size: 9 }, maxTicksLimit: 6 } }
                        }
                    }
                });
            }
        }, 300);
    }
}



// ====== Researcher Mode Implementation ======
// Full Parity with GEE Script (egypt_full_4_update_JS.groovy)
// ============================================================

function buildResearcherMode() {
    setPanelTitle('🌍 وضع الباحث (Researcher Mode)');

    var html = '<div class="card">' +
        '  <div class="card-title">1) النطاق الجغرافي</div>' +
        '  <p style="font-size:12px;color:#666;">اختر المحافظة أو ارسم منطقة الدراسة:</p>' +
        '  <select id="gov-select" class="form-select" style="width:100%;margin-bottom:10px;" onchange="handleGovChange()">' +
        '    <option value="">-- اختر المحافظة --</option>' +
        '  </select>' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">' +
        '    <button class="btn" style="background:#FF5722;color:white;font-size:12px;" onclick="enableDrawing()">✏️ ارسم منطقة</button>' +
        '    <button class="btn" style="background:#757575;color:white;font-size:12px;" onclick="clearDrawnRegion();clearGovBoundary()">🗑️ مسح الخريطة</button>' +
        '  </div>' +
        '  <div id="region-status" style="font-size:11px;color:#888;padding:4px 0;">📍 لم يتم تحديد منطقة بعد</div>' +
        '</div>';

    html += '<div class="card">' +
        '  <div class="card-title">2) الفترة الزمنية والمستشعر</div>' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
        '    <div style="font-size:12px;">من:<input type="date" id="research-start" value="2024-01-01" style="width:100%;"></div>' +
        '    <div style="font-size:12px;">إلى:<input type="date" id="research-end" value="2024-12-31" style="width:100%;"></div>' +
        '  </div>' +
        '  <select id="sensor-select" class="form-select" style="width:100%;margin-bottom:8px;">' +
        '    <option value="Sentinel-2">Sentinel-2 (10m)</option>' +
        '    <option value="Landsat 8">Landsat 8 (30m)</option>' +
        '    <option value="Landsat 7">Landsat 7 (30m)</option>' +
        '    <option value="Landsat 5">Landsat 5 (30m)</option>' +
        '  </select>' +
        '  <div style="display:flex;align-items:center;gap:8px;">' +
        '    <label style="font-size:12px;white-space:nowrap;">🔆 شفافية الطبقة:</label>' +
        '    <input type="range" id="opacity-slider" min="0" max="1" step="0.1" value="1" style="flex:1;" oninput="updateLayerOpacity(this.value)">' +
        '    <span id="opacity-val" style="font-size:12px;min-width:30px;">100%</span>' +
        '  </div>' +
        '</div>';

    // --- A) Basic Analysis ---
    html += '<div class="card">' +
        '  <div class="card-title" style="cursor:pointer;" onclick="toggleSection(\'basic-analysis\')">A) التحليل الأساسي (Basic Analysis) <span id="basic-analysis-icon">▾</span></div>' +
        '  <div id="basic-analysis">' +
        '  <select id="index-select" class="form-select" style="width:100%;margin-bottom:8px;">';

    var indices = [
        'NDVI', 'EVI', 'SAVI', 'NDMI', 'GCI', 'NDWI', 'MNDWI', 'NDBI', 'BSI',
        'NBR', 'NDSI', 'ClayRatio', 'IronOxide', 'GypsumIndex', 'CarbonateIndex',
        'ESI', 'SI3', 'SOM', 'Turbidity', 'Chlorophyll_a'
    ];
    indices.forEach(function (idx) {
        html += '<option value="' + idx + '">' + idx + '</option>';
    });
    html += '</select>';

    html += '  <button class="btn" style="width:100%;background:#4CAF50;color:white;margin-bottom:6px;" onclick="runResearcherAnalysis(\'update-layer\')">🔄 تحديث الطبقة (Update Layer)</button>' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">' +
        '    <button class="btn" style="background:#2196F3;color:white;" onclick="runResearcherAnalysis(\'true-color\')">📸 True Color RGB</button>' +
        '    <button class="btn" style="background:#FF5722;color:white;" onclick="runResearcherAnalysis(\'false-color\')">🎨 False Color NIR</button>' +
        '  </div>' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
        '    <button class="btn" style="background:#9C27B0;color:white;" onclick="runResearcherAnalysis(\'time-series\')">📈 Time Series</button>' +
        '    <button class="btn" style="background:#FF9800;color:white;" onclick="runResearcherAnalysis(\'zonal-stats\')">🏘️ Gov. Comparison</button>' +
        '  </div>' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">' +
        '    <button class="btn" style="background:#673AB7;color:white;" onclick="runResearcherAnalysis(\'land-cover\')">🌍 Land Cover (DW)</button>' +
        '    <button class="btn" style="background:#607D8B;color:white;" onclick="runResearcherAnalysis(\'change-detect-ui\')">🌓 Change Detection</button>' +
        '  </div>' +
        '  </div>' +
        '</div>';

    // Change Detection sub-panel
    html += '<div class="card" id="change-detection-panel" style="display:none;">' +
        '  <div class="card-title">كشف التغير (Change Detection)</div>' +
        '  <p style="font-size:11px;color:#888;">مقارنة بين فترتين زمنيتين (P2 - P1)</p>' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
        '    <div style="font-size:11px;">P1 من:<input type="date" id="p1-start" value="2020-01-01" style="width:100%;"></div>' +
        '    <div style="font-size:11px;">P1 إلى:<input type="date" id="p1-end" value="2020-12-31" style="width:100%;"></div>' +
        '  </div>' +
        '  <button class="btn" style="width:100%;background:#673AB7;color:white;" onclick="runResearcherAnalysis(\'change-detection\')">▶ تشغيل كشف التغير</button>' +
        '</div>';

    // --- B) Physical & Climate Layers ---
    html += '<div class="card">' +
        '  <div class="card-title" style="cursor:pointer;" onclick="toggleSection(\'physical-layers\')">B) الطبقات الفيزيائية والمناخية <span id="physical-layers-icon">▾</span></div>' +
        '  <div id="physical-layers">' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'lst\')">🌡️ LST (Landsat)</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'precip\')">🌧️ Rainfall (CHIRPS)</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'elevation\')">⛰️ Elevation (SRTM)</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'slope\')">📐 Slope</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'s1-moisture\')">💧 SAR Soil Moisture</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'et-modis\')">💦 ET (MODIS)</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'era5-sm\')">🌍 Root-Zone SM (ERA5)</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'nighttime-lights\')">🌃 Nighttime Lights</button>' +
        '  </div>' +
        '  </div>' +
        '</div>';

    // --- C) Research Models: Soil & Climate ---
    html += '<div class="card">' +
        '  <div class="card-title" style="cursor:pointer;" onclick="toggleSection(\'soil-models\')">C) نماذج بحثية: التربة والمناخ <span id="soil-models-icon">▾</span></div>' +
        '  <div id="soil-models">' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
        '    <button class="btn btn-outline" style="background:#fff3e0;" onclick="runResearcherAnalysis(\'vhi\')">🌾 VHI Health Index</button>' +
        '    <button class="btn btn-outline" style="background:#fff3e0;" onclick="runResearcherAnalysis(\'salinity-risk\')">🧂 Salinity V4.3</button>' +
        '    <button class="btn btn-outline" style="background:#fff3e0;" onclick="runResearcherAnalysis(\'drought\')">🌵 Drought Index (CDI)</button>' +
        '    <button class="btn btn-outline" style="background:#fff3e0;" onclick="runResearcherAnalysis(\'desert-risk\')">🏜️ Desertification Risk</button>' +
        '    <button class="btn btn-outline" style="background:#fff3e0;" onclick="runResearcherAnalysis(\'lst-trend\')">📉 LST Warming Trend</button>' +
        '    <button class="btn btn-outline" style="background:#fff3e0;" onclick="runResearcherAnalysis(\'soil-texture\')">🧱 Soil Texture Map</button>' +
        '  </div>' +
        '  </div>' +
        '</div>';

    // --- D) Agro-Economic Models ---
    html += '<div class="card">' +
        '  <div class="card-title" style="cursor:pointer;" onclick="toggleSection(\'agro-models\')">D) النماذج الزراعية والاقتصادية <span id="agro-models-icon">▾</span></div>' +
        '  <div id="agro-models">' +
        '  <div style="font-size:12px;margin-bottom:6px;">المحصول:' +
        '  <select id="research-crop" class="form-select" style="width:100%;">' +
        '    <option value="Wheat">قمح (Wheat)</option>' +
        '    <option value="Maize">ذرة (Maize)</option>' +
        '    <option value="Rice">أرز (Rice)</option>' +
        '    <option value="Cotton">قطن (Cotton)</option>' +
        '    <option value="Sugarcane">قصب سكر (Sugarcane)</option>' +
        '  </select></div>' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
        '    <button class="btn btn-outline" style="background:#e8f5e9;" onclick="runResearcherAnalysis(\'carbon-stock\')">🌱 Carbon Stock</button>' +
        '    <button class="btn btn-outline" style="background:#e8f5e9;" onclick="runResearcherAnalysis(\'carbon-change\')">📊 Carbon Change</button>' +
        '    <button class="btn btn-outline" style="background:#e8f5e9;" onclick="runResearcherAnalysis(\'crop-yield\')">🌾 Crop Yield Model</button>' +
        '    <button class="btn btn-outline" style="background:#e8f5e9;" onclick="runResearcherAnalysis(\'yield-comparison\')">📈 Yield Comparison</button>' +
        '    <button class="btn btn-outline" style="background:#e8f5e9;" onclick="runResearcherAnalysis(\'wue\')">💧 WUE Analysis</button>' +
        '    <button class="btn btn-outline" style="background:#e8f5e9;" onclick="runResearcherAnalysis(\'heat-stress\')">🌡️ Heat Stress</button>' +
        '  </div>' +
        '  </div>' +
        '</div>';

    // --- E) AI & Classification ---
    html += '<div class="card">' +
        '  <div class="card-title" style="cursor:pointer;" onclick="toggleSection(\'ai-class\')">E) الذكاء الاصطناعي والتصنيف <span id="ai-class-icon">▾</span></div>' +
        '  <div id="ai-class">' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
        '    <button class="btn btn-outline" style="background:#e3f2fd;" onclick="runResearcherAnalysis(\'ai-classification\')">🌲 AI Classification (RF)</button>' +
        '    <button class="btn btn-outline" style="background:#e3f2fd;" onclick="runResearcherAnalysis(\'long-veg-trend\')">📉 Long-term Veg Trend</button>' +
        '  </div>' +
        '  </div>' +
        '</div>';

    // --- F) Visual Tools ---
    html += '<div class="card">' +
        '  <div class="card-title" style="cursor:pointer;" onclick="toggleSection(\'visual-tools\')">F) أدوات التصور والمقارنة <span id="visual-tools-icon">▾</span></div>' +
        '  <div id="visual-tools">' +
        '  <button class="btn" style="width:100%;background:#6A1B9A;color:white;margin-bottom:6px;" onclick="runResearcherAnalysis(\'split-map\')">🔄 Split Map (Swipe Comparison)</button>' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">' +
        '    <div style="font-size:11px;">P1 Start:<input type="date" id="vis-p1-start" value="2015-01-01" style="width:100%;"></div>' +
        '    <div style="font-size:11px;">P1 End:<input type="date" id="vis-p1-end" value="2015-12-31" style="width:100%;"></div>' +
        '  </div>' +
        '  <div style="border-top:1px dashed #ccc;padding-top:8px;margin-top:4px;">' +
        '    <p style="font-size:11px;margin:0 0 4px;">🎬 Time-Lapse GIF:</p>' +
        '    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px;">' +
        '      <div style="font-size:11px;">Start:<input type="number" id="tl-start-year" value="2000" style="width:100%;"></div>' +
        '      <div style="font-size:11px;">End:<input type="number" id="tl-end-year" value="2023" style="width:100%;"></div>' +
        '      <div style="font-size:11px;">FPS:<input type="number" id="tl-fps" value="4" min="1" max="10" style="width:100%;"></div>' +
        '    </div>' +
        '    <button class="btn" style="width:100%;background:#1565C0;color:white;margin-bottom:6px;" onclick="runResearcherAnalysis(\'time-lapse\')">🎬 إنشاء Time-Lapse GIF</button>' +
        '  </div>' +
        '  <button class="btn" style="width:100%;background:#00838F;color:white;" onclick="runResearcherAnalysis(\'water-history\')">💧 Water History (JRC 35 years)</button>' +
        '  </div>' +
        '</div>';

    // --- NEW: Layer Manager Panel ---
    html += '<div class="card" style="border: 1px solid #2196F3;">' +
        '  <div class="card-title" style="cursor:pointer; color:#0D47A1;" onclick="toggleSection(\'layer-manager\')">🛠️ إدارة الطبقات (Layers) <span id="layer-manager-icon">▾</span></div>' +
        '  <div id="layer-manager">' +
        '    <div id="res-layer-list" style="max-height:150px; overflow-y:auto; padding:5px; background:#fff; border:1px solid #ddd; border-radius:4px; margin-bottom:8px;">' +
        '      <div style="color:#999;font-size:11px;padding:6px;">لا توجد طبقات مضافة حالياً.</div>' +
        '    </div>' +
        '    <button class="btn btn-outline" style="width:100%; font-size:12px; color:#D32F2F; border-color:#ef9a9a;" onclick="clearAllResLayers()">🗑️ إزالة جميع الطبقات</button>' +
        '  </div>' +
        '</div>';

    // --- G) Export ---
    html += '<div class="card">' +
        '  <div class="card-title" style="cursor:pointer;" onclick="toggleSection(\'export-tools\')">G) تصدير البيانات (Export) <span id="export-tools-icon">▾</span></div>' +
        '  <div id="export-tools">' +
        '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'export-image\')">📥 Export Image (GEE)</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'export-table\')">📊 Export Stats (CSV)</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'threshold-mask\')">🎭 Threshold Mask</button>' +
        '    <button class="btn btn-outline" onclick="runResearcherAnalysis(\'generate-report\')">📋 Generate Report</button>' +
        '  </div>' +
        '  </div>' +
        '</div>';

    // Stats display area
    html += '<div id="research-stats" class="card" style="display:none;background:#f5f5f5;border:1px dashed #ccc;">' +
        '  <div class="card-title" style="background:#e0e0e0;color:#333;">📊 إحصائيات المنطقة (Stats)</div>' +
        '  <div id="stats-content" style="font-size:12px;padding:5px;"></div>' +
        '</div>';

    html += '<button class="btn btn-back" style="width:100%;margin-top:20px;" onclick="showWelcome()">🔙 رجوع للقائمة الرئيسية</button>';

    setPanelContent(html);
    loadGovernoratesList();

    // Refresh layers in case we toggled modes and have existing ones
    if (typeof refreshLayerPanel === 'function') refreshLayerPanel();
}

// ------ Collapse/Expand sections ------
function toggleSection(id) {
    var el = document.getElementById(id);
    var icon = document.getElementById(id + '-icon');
    if (!el) return;

    if (el.style.display !== 'none') {
        el.style.display = 'none';
        if (icon) icon.innerHTML = '▸';
    } else {
        el.style.display = 'block';
        if (icon) icon.innerHTML = '▾';
    }
}

// Global helper for safe data extraction
function safeGet(obj, band, stat, fallback) {
    if (!obj) return fallback;
    if (obj[band] !== undefined && (stat === null || obj[band][stat] === undefined)) {
        var v = obj[band];
        return (v !== undefined && v !== null && !isNaN(v)) ? v : fallback;
    }
    var sub = obj[band];
    if (sub && typeof sub === 'object' && sub[stat] !== undefined && sub[stat] !== null) return sub[stat];
    return fallback;
}
window.safeGet = safeGet;

// ------ Opacity slider ------
function updateLayerOpacity(val) {
    document.getElementById('opacity-val').textContent = Math.round(val * 100) + '%';
    if (window.currentEELayer && window.map) {
        window.currentEELayer.setOpacity(parseFloat(val));
    }
}

// ------ Researcher Helper: Load Governorates ------
function loadGovernoratesList(elementId) {
    elementId = elementId || 'gov-select';
    var adminBoundariesAsset = 'projects/ee-elsayedfarouk/assets/Egypt_GADM_Boundaries';
    var adminBoundaries = ee.FeatureCollection(adminBoundariesAsset);

    adminBoundaries.aggregate_array('NAME_1').distinct().sort().evaluate(function (list, err) {
        var select = document.getElementById(elementId);
        if (err || !select) return;
        list.forEach(function (name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.innerText = name;
            select.appendChild(opt);
        });
    });
}

// ------ Researcher Helper: Handle Gov Change (Auto-zoom + Boundary) ------
function handleGovChange() {
    var govName = document.getElementById('gov-select').value;
    if (!govName) return;
    var adminBoundariesAsset = 'projects/ee-elsayedfarouk/assets/Egypt_GADM_Boundaries';
    var adminBoundaries = ee.FeatureCollection(adminBoundariesAsset);
    var region = adminBoundaries.filter(ee.Filter.eq('NAME_1', govName));

    // Update status
    var statusEl = document.getElementById('region-status');
    if (statusEl) statusEl.innerHTML = '⏳ جاري تحميل ' + govName + '...';

    region.geometry().evaluate(function (geom) {
        if (!geom) {
            if (statusEl) statusEl.innerHTML = '❌ فشل تحميل المحافظة';
            return;
        }
        window.currentRegion = ee.Geometry(geom);

        // Auto-zoom to governorate
        if (typeof fitToBounds === 'function') {
            fitToBounds(geom);
        }
        // Show boundary on map
        if (typeof addGeoJsonBoundary === 'function') {
            addGeoJsonBoundary(geom, govName);
        }
        // Clear any drawn region (gov takes priority)
        if (typeof clearDrawnRegion === 'function') {
            clearDrawnRegion();
        }

        if (statusEl) statusEl.innerHTML = '? 📍 الموقع: <b>' + govName + '</b>';
    });
}

// ====== RESEARCHER LAYER REGISTRY ======
window._resLayers = {}; // { name: { layer, visible } }

function addResearcherLayer(eeImage, vis, name) {
    // Remove old layer with the same name
    if (window._resLayers[name]) {
        map.removeLayer(window._resLayers[name].layer);
        delete window._resLayers[name];
    }

    eeImage.getMap(vis, function (mapObj) {
        var tileLayer = L.tileLayer(mapObj.urlFormat, { maxZoom: 20, opacity: 0.8 });

        // Auto-hide all other layers to act like Earth Engine exclusive switching
        Object.keys(window._resLayers).forEach(function (n) {
            if (window._resLayers[n].visible) {
                map.removeLayer(window._resLayers[n].layer);
                window._resLayers[n].visible = false;
            }
        });

        tileLayer.addTo(map);
        window._resLayers[name] = { layer: tileLayer, visible: true };
        window.currentEELayer = tileLayer;
        hideLoading();
        refreshLayerPanel();
    });
}

function refreshLayerPanel() {
    var list = document.getElementById('res-layer-list');
    if (!list) return;
    var names = Object.keys(window._resLayers);
    if (names.length === 0) {
        list.innerHTML = '<div style="color:#999;font-size:11px;padding:6px;">أضف طبقة للتحليل</div>';
        return;
    }
    list.innerHTML = names.reverse().map(function (n) {
        var entry = window._resLayers[n];
        var vis = entry.visible;
        return '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #eee;">' +
            '<button onclick="toggleResLayer(\'' + n + '\')" style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;" title="إظهار/إخفاء الطبقة">' + (vis ? '👁️' : '🙈') + '</button>' +
            '<span style="flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:right;" title="' + n + '">' + n + '</span>' +
            '<input type="range" min="0" max="1" step="0.05" value="' + (entry.layer.options.opacity || 0.8) + '" style="width:60px;" title="تعديل الشفافية" oninput="setResLayerOpacity(\'' + n + '\',this.value)">' +
            '<button onclick="removeResLayer(\'' + n + '\')" style="background:none;border:none;cursor:pointer;color:#D32F2F;font-weight:bold;font-size:14px;padding:0;margin-right:5px;" title="إزالة الطبقة">✕</button>' +
            '</div>';
    }).join('');
}

function toggleResLayer(name) {
    var entry = window._resLayers[name];
    if (!entry) return;
    if (entry.visible) {
        map.removeLayer(entry.layer);
        entry.visible = false;
    } else {
        entry.layer.addTo(map);
        entry.visible = true;
    }
    refreshLayerPanel();
}

function setResLayerOpacity(name, val) {
    var entry = window._resLayers[name];
    if (entry) entry.layer.setOpacity(parseFloat(val));
}

function removeResLayer(name) {
    var entry = window._resLayers[name];
    if (entry) { map.removeLayer(entry.layer); delete window._resLayers[name]; }
    refreshLayerPanel();
}

function clearAllResLayers() {
    Object.keys(window._resLayers).forEach(function (n) {
        map.removeLayer(window._resLayers[n].layer);
    });
    window._resLayers = {};
    refreshLayerPanel();
}



function showStatsBox(html) {
    var box = document.getElementById('research-stats');
    var content = document.getElementById('stats-content');
    if (box) box.style.display = 'block';
    if (content) content.innerHTML = html;
}

// ------ Show Research Result ------
function showResearchResult(msg, color) {
    showStatsBox('<div style="padding:8px;color:' + (color || '#333') + ';">' + msg + '</div>');
}

function toggleChangeDetectPanel() {
    var panel = document.getElementById('change-detection-panel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// ====== MAIN RESEARCHER ANALYSIS DISPATCHER ======
function runResearcherAnalysis(type) {
    // Special UI toggles (no GEE needed)
    if (type === 'change-detect-ui') {
        toggleChangeDetectPanel();
        return;
    }

    if (!window.currentRegion && type !== 'generate-report') {
        alert('يرجى اختيار محافظة أولاً!');
        return;
    }

    var start = document.getElementById('research-start') ? document.getElementById('research-start').value : '2024-01-01';
    var end = document.getElementById('research-end') ? document.getElementById('research-end').value : '2024-12-31';
    var sensor = document.getElementById('sensor-select') ? document.getElementById('sensor-select').value : 'Sentinel-2';
    var index = document.getElementById('index-select') ? document.getElementById('index-select').value : 'NDVI';

    showLoading('جاري تحليل البيانات...');

    // ---- Physical layers that don't need optical collection ----
    if (type === 'elevation') {
        var dem = ee.Image('USGS/SRTMGL1_003').clip(window.currentRegion);
        addEELayer(dem, { min: 0, max: 500, palette: ['#006600', '#ADFF2F', '#FFFF00', '#FF8C00', '#8B4513', '#FFFFFF'] }, 'Elevation_SRTM');
        showResearchResult('✅ طبقة الارتفاع (SRTM) - من 0 إلى 500+ متر', '#1565C0');
        hideLoading();
        return;
    }

    if (type === 'slope') {
        var dem = ee.Image('USGS/SRTMGL1_003');
        var slope = ee.Terrain.slope(dem).clip(window.currentRegion);
        addEELayer(slope, { min: 0, max: 25, palette: ['#006400', '#ADFF2F', '#FFFF00', '#FF8C00', '#FF0000'] }, 'Slope_SRTM');
        showResearchResult('✅ طبقة الانحدار (Slope) - من 0 إلى 25+ درجة', '#1565C0');
        hideLoading();
        return;
    }

    if (type === 'lst') {
        var lsCol = getMergedLandsatCollection(start, end, window.currentRegion);
        lsCol.size().evaluate(function (sz) {
            if (sz === 0) { hideLoading(); alert('لا توجد صور لاندسات في هذه الفترة!'); return; }
            var lst = lsCol.select('LST').median().clip(window.currentRegion);
            addEELayer(lst, { min: 15, max: 55, palette: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#ffffbf', '#fee090', '#f46d43', '#d73027', '#a50026'] }, 'LST_Landsat');
            lst.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.min(), '', true).combine(ee.Reducer.max(), '', true), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                hideLoading();
                if (!res) return;
                showResearchResult(
                    '<strong>🌡️ درجة حرارة السطح (LST)</strong><br>' +
                    'المتوسط: ' + (res['LST_mean'] || 0).toFixed(1) + ' °C<br>' +
                    'الأدنى: ' + (res['LST_min'] || 0).toFixed(1) + ' °C<br>' +
                    'الأقصى: ' + (res['LST_max'] || 0).toFixed(1) + ' °C'
                );
            });
        });
        return;
    }

    if (type === 'precip') {
        var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterDate(start, end).filterBounds(window.currentRegion).sum().clip(window.currentRegion);
        addEELayer(chirps, { min: 0, max: 200, palette: ['#FFFFFF', '#E1F5FE', '#4FC3F7', '#0288D1', '#01579B'] }, 'Precipitation_CHIRPS');
        chirps.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.sum(), '', true), geometry: window.currentRegion, scale: 1000, maxPixels: 1e8 }).evaluate(function (res) {
            hideLoading();
            showResearchResult('<strong>🌧️ هطول الأمطار التراكمي (CHIRPS)</strong><br>المتوسط: ' + (res['precipitation_mean'] || 0).toFixed(1) + ' mm<br>المجموع: ' + (res['precipitation_sum'] || 0).toFixed(0) + ' mm');
        });
        return;
    }

    if (type === 'era5-sm') {
        var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR').filterDate(start, end).filterBounds(window.currentRegion).select('volumetric_soil_water_layer_1').mean().multiply(100).clip(window.currentRegion);
        addEELayer(era5, { min: 0, max: 40, palette: ['#FFF9C4', '#F9A825', '#7B3F00', '#1565C0', '#0D47A1'] }, 'ERA5_SoilMoisture');
        hideLoading();
        showResearchResult('✅ رطوبة التربة (ERA5-Land) - المتوسط اليومي (%)');
        return;
    }

    if (type === 'nighttime-lights') {
        var viirs = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG').filterDate(start, end).filterBounds(window.currentRegion).select('avg_rad').mean().clip(window.currentRegion);
        addEELayer(viirs, { min: 0, max: 60, palette: ['black', '#333', '#666', 'yellow', 'white'] }, 'Nighttime_Lights_VIIRS');
        hideLoading();
        showResearchResult('✅ أضواء الليل (VIIRS) - مؤشر النشاط البشري');
        return;
    }

    if (type === 'water-history') {
        var jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').clip(window.currentRegion);
        var transition = jrc.select('transition');
        addEELayer(transition, { min: 0, max: 10, palette: ['ffffff', '0000ff', '22b14c', 'd1102d', '99d9ea', 'b5e61d', 'e6a1aa', 'ff7f27', 'ffc90e', '7f7f7f', 'c3c3c3'] }, 'Water_History_JRC');
        hideLoading();
        showResearchResult(
            '<strong>💧 تاريخ المياه (JRC 1984-2021)</strong><br>' +
            '🟦 أزرق: مياه دائمة<br>' +
            '🟩 أخضر: مياه جديدة (كانت أرضاً)<br>' +
            '🟥 أحمر: مياه مفقودة (صارت أرضاً)<br>' +
            '⬜ أبيض: لا مياه'
        );
        return;
    }

    if (type === 'lst-trend') {
        var trend = calculateLSTTrend(window.currentRegion);
        addEELayer(trend, { min: -0.5, max: 0.5, palette: ['blue', 'white', 'red'] }, 'LST_Warming_Trend');
        hideLoading();
        showResearchResult('✅ اتجاه الاحترار (LST Trend) - أحمر = ارتفاع، أزرق = انخفاض');
        return;
    }

    if (type === 'long-veg-trend') {
        // Long-term NDVI trend from Landsat
        var lsAll = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')).merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')).filterDate('1990-01-01', '2024-12-31').filterBounds(window.currentRegion).filter(ee.Filter.lt('CLOUD_COVER', 20));
        var lsNDVI = lsAll.map(function (img) {
            var nir = img.select(img.bandNames().filter(ee.Filter.stringContains('item', 'B4')).get(0)).multiply(0.0000275).add(-0.2);
            var red = img.select(img.bandNames().filter(ee.Filter.stringContains('item', 'B3')).get(0)).multiply(0.0000275).add(-0.2);
            return img.normalizedDifference([nir.bandNames().get(0), red.bandNames().get(0)]).rename('NDVI').copyProperties(img, ['system:time_start']);
        });
        hideLoading();
        showResearchResult('⚠️ اتجاه NDVI طويل الأمد - يتطلب تشغيل في Code Editor للدقة الكاملة. جاري عرض NDVI الحالي...');
        var col = getAnyCollection(sensor, start, end, window.currentRegion);
        col.median().normalizedDifference(['NIR', 'RED']).rename('NDVI').clip(window.currentRegion).evaluate(function () { });
        return;
    }

    if (type === 'split-map') {
        var p1Start = document.getElementById('vis-p1-start') ? document.getElementById('vis-p1-start').value : '2015-01-01';
        var p1End = document.getElementById('vis-p1-end') ? document.getElementById('vis-p1-end').value : '2015-12-31';
        showSplitMapComparison(p1Start, p1End, start, end);
        return;
    }

    if (type === 'time-lapse') {
        showTimeLapseGIF();
        return;
    }

    if (type === 'ai-classification') {
        runAIClassification(start, end, sensor);
        return;
    }

    // ---- Types that need optical collection ----
    var col = getAnyCollection(sensor, start, end, window.currentRegion);

    col.size().evaluate(function (size, err) {
        if (err || size === 0) {
            hideLoading();
            alert('لا توجد صور متوفرة لهذه الفترة / المستشعر!');
            return;
        }

        var result = col.median().clip(window.currentRegion);

        if (type === 'update-layer') {
            var indexImg = safeIndex(result, index);
            var vis = visParamsDict[index] || { min: 0, max: 1 };
            // Use addResearcherLayer so it appears in the layer control panel
            addResearcherLayer(indexImg, vis, index + ' (' + start.slice(0, 4) + '-' + end.slice(0, 4) + ')');

            var stats = indexImg.rename('val').reduceRegion({
                reducer: ee.Reducer.mean().combine(ee.Reducer.min(), '', true).combine(ee.Reducer.max(), '', true).combine(ee.Reducer.stdDev(), '', true),
                geometry: window.currentRegion, scale: 100, maxPixels: 1e8
            });
            stats.evaluate(function (res) {
                if (!res) return;
                showStatsBox(
                    '<strong>📊 إحصائيات: ' + index + '</strong><br>' +
                    'المتوسط: ' + (res.val_mean || 0).toFixed(4) + '<br>' +
                    'الأدنى: ' + (res.val_min || 0).toFixed(4) + '<br>' +
                    'الأقصى: ' + (res.val_max || 0).toFixed(4) + '<br>' +
                    'الانحراف: ±' + (res.val_stdDev || 0).toFixed(4)
                );
            });
        }

        else if (type === 'true-color') {
            addResearcherLayer(result, { min: 0, max: 0.3, bands: ['RED', 'GREEN', 'BLUE'], gamma: 1.3 }, 'True Color (' + sensor + ')');
            showResearchResult('✅ الألوان الطبيعية (True Color RGB)');
        }

        else if (type === 'false-color') {
            addResearcherLayer(result, { min: 0, max: 0.5, bands: ['NIR', 'RED', 'GREEN'] }, 'False Color NIR-R-G');
            showResearchResult('✅ الألوان الكاذبة (NIR/Red/Green) - النباتات باللون الأحمر');
        }

        else if (type === 'time-series') {
            showLoading('جاري حساب السلسلة الزمنية...');
            var indexCol = col.map(function (img) {
                var idx = safeIndex(img, index);
                var mean = idx.reduceRegion({ reducer: ee.Reducer.mean(), geometry: window.currentRegion, scale: 500, maxPixels: 1e8 }).get(index);
                return img.set('mean_val', mean);
            }).filter(ee.Filter.notNull(['mean_val']));

            ee.Dictionary({
                dates: indexCol.aggregate_array('system:time_start'),
                vals: indexCol.aggregate_array('mean_val')
            }).evaluate(function (res) {
                hideLoading();
                if (!res) return;
                var labels = res.dates.map(function (d) { return new Date(d).toLocaleDateString('ar-EG'); });
                var vals = res.vals;

                var statsBox = document.getElementById('research-stats');
                var statsContent = document.getElementById('stats-content');
                if (statsBox) statsBox.style.display = 'block';
                if (statsContent) statsContent.innerHTML =
                    '<strong>📈 السلسلة الزمنية: ' + index + '</strong>' +
                    '<div style="height:180px;margin-top:8px;"><canvas id="researchChart"></canvas></div>';

                setTimeout(function () {
                    var ctx = document.getElementById('researchChart');
                    if (!ctx || typeof Chart === 'undefined') return;
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{ label: index, data: vals, borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)', fill: true, tension: 0.3 }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
                    });
                }, 100);
            });
        }

        else if (type === 'zonal-stats') {
            showLoading('جاري مقارنة المحافظات...');
            var indexImg = safeIndex(result, index);
            var boundaries = ee.FeatureCollection('projects/ee-elsayedfarouk/assets/Egypt_GADM_Boundaries');
            var zonalResults = indexImg.rename('mean').reduceRegions({
                collection: boundaries,
                reducer: ee.Reducer.mean(),
                scale: 1000
            });
            zonalResults.sort('mean', false).limit(12).evaluate(function (res, err) {
                hideLoading();
                if (err || !res) { alert('خطأ في الإحصائيات الإقليمية'); return; }
                var html = '<strong>🏘️ مقارنة المحافظات: ' + index + '</strong><br/>';
                html += '<div style="max-height:200px;overflow-y:auto;margin-top:6px;">';
                html += '<table style="width:100%;font-size:11px;border-collapse:collapse;">';
                html += '<tr><th style="border-bottom:1px solid #ddd;text-align:right;padding:2px;">المحافظة</th><th style="border-bottom:1px solid #ddd;text-align:left;padding:2px;">' + index + '</th></tr>';
                res.features.forEach(function (f, i) {
                    var bg = i % 2 === 0 ? '#f9f9f9' : '#fff';
                    html += '<tr style="background:' + bg + '"><td style="padding:2px;text-align:right;">' + (f.properties.NAME_1 || '-') + '</td><td style="padding:2px;text-align:left;">' + ((f.properties.mean || 0).toFixed(4)) + '</td></tr>';
                });
                html += '</table></div>';
                showStatsBox(html);
            });
        }

        else if (type === 'land-cover') {
            showLoading('جاري تصنيف الغطاء الأرضي...');
            var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(window.currentRegion).filterDate(start, end).select('label').mode().clip(window.currentRegion);
            addResearcherLayer(dw, {
                min: 0, max: 8,
                palette: ['#419BDF', '#397D49', '#88B053', '#7A87C6', '#E49635', '#DFC35A', '#C4281B', '#A59B8F', '#B39FE1']
            }, 'DynamicWorld_LandCover');
            hideLoading();
            showResearchResult(
                '<strong>🌍 الغطاء الأرضي (Dynamic World)</strong><br>' +
                '🔵 ماء | 🌲 غابات | 🌿 نباتات منخفضة<br>' +
                '🟣 محاصيل زراعية | 🟠 شجيرات/أعشاب<br>' +
                '🟡 أراضي رطبة | 🔴 مدن | ⬜ أرض عارية | 🌸 ثلج'
            );
        }

        else if (type === 'change-detection') {
            var p1Start = document.getElementById('p1-start') ? document.getElementById('p1-start').value : '2020-01-01';
            var p1End = document.getElementById('p1-end') ? document.getElementById('p1-end').value : '2020-12-31';
            var col1 = getAnyCollection(sensor, p1Start, p1End, window.currentRegion);
            col1.size().evaluate(function (sz) {
                if (sz === 0) { hideLoading(); alert('لا توجد صور للفترة P1'); return; }
                var img1 = col1.median().clip(window.currentRegion);
                var idx1 = safeIndex(img1, index);
                var idx2 = safeIndex(result, index);
                var diff = idx2.subtract(idx1).clip(window.currentRegion);
                addResearcherLayer(diff, { min: -0.4, max: 0.4, palette: ['#d73027', '#fc8d59', '#fee090', '#ffffff', '#d9ef8b', '#91cf60', '#1a9850'] }, 'Change_' + index + '_P2-P1');

                diff.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', true), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                    hideLoading();
                    if (!res) return;
                    var mean = res[Object.keys(res)[0]] || 0;
                    var trend = mean > 0.02 ? '✅ تحسن' : mean < -0.02 ? '⚠️ تراجع' : '➡️ مستقر';
                    showResearchResult('<strong>🌓 كشف التغير: ' + index + '</strong><br>التغير المتوسط: ' + mean.toFixed(4) + '<br>الاتجاه: ' + trend);
                });
            });
        }

        else if (type === 's1-moisture') {
            showLoading('جاري تحميل بيانات SAR...');
            var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
                .filterDate(start, end).filterBounds(window.currentRegion)
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                .select('VV').map(function (img) {
                    return img.focal_median(30, 'square', 'meters');
                }).mean().clip(window.currentRegion);
            addResearcherLayer(s1, { min: -25, max: 0, palette: ['#FFF9C4', '#F9A825', '#1565C0'] }, 'S1_Backscatter_VV');
            hideLoading();
            showResearchResult('✅ Sentinel-1 Backscatter VV - دليل على رطوبة التربة');
        }

        else if (type === 'et-modis') {
            var modisET = ee.ImageCollection('MODIS/006/MOD16A2').filterDate(start, end).filterBounds(window.currentRegion).select('ET').mean().multiply(0.1).clip(window.currentRegion);
            addResearcherLayer(modisET, { min: 0, max: 100, palette: ['#FFF9C4', '#66BB6A', '#1565C0'] }, 'ET_MODIS');
            hideLoading();
            showResearchResult('✅ التبخر-النتح (MODIS MOD16) - mm/8 أيام');
        }

        else if (type === 'vhi') {
            showLoading('جاري حساب مؤشر صحة النبات...');
            var vhi = calculateVHI(start, end, window.currentRegion);
            addResearcherLayer(vhi, { min: 0, max: 1, palette: ['#FF0000', '#FFA500', '#FFFF00', '#ADFF2F', '#008000'] }, 'VHI_Model');
            vhi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                hideLoading();
                var val = res ? (res.VHI || res[Object.keys(res)[0]] || 0) : 0;
                var interp = val < 0.2 ? '☠️ جفاف شديد' : val < 0.4 ? '⚠️ إجهاد نباتي' : val < 0.6 ? '🟡 صحة متوسطة' : '✅ صحة جيدة';
                showResearchResult('<strong>🌾 مؤشر صحة النبات (VHI)</strong><br>المتوسط: ' + val.toFixed(3) + '<br>التقييم: ' + interp);
            });
        }

        else if (type === 'salinity-risk') {
            showLoading('جاري حساب نموذج الملوحة V4.3...');
            var s1Col = ee.ImageCollection('COPERNICUS/S1_GRD').filterDate(start, end).filterBounds(window.currentRegion).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH')).mean().clip(window.currentRegion);
            var dem = ee.Image('USGS/SRTMGL1_003');
            var slope = ee.Terrain.slope(dem);
            var lstC = getMergedLandsatCollection(start, end, window.currentRegion).select('LST').median();
            var precip = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterDate(start, end).filterBounds(window.currentRegion).sum().clip(window.currentRegion);
            var et = ee.ImageCollection('MODIS/006/MOD16A2').filterDate(start, end).filterBounds(window.currentRegion).select('ET').mean().multiply(0.1);
            var salinity = estimateSalinity_ML(result, s1Col, lstC, precip, et, dem, slope, null);
            salinity = salinity.clip(window.currentRegion);
            addResearcherLayer(salinity, { min: 0.5, max: 20, palette: ['#00BFFF', '#00FA9A', '#7CFC00', '#FFD700', '#FF8C00', '#FF0000', '#8B0000'] }, 'Salinity_V4.3');
            salinity.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.max(), '', true), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                hideLoading();
                var mean = res ? (res[Object.keys(res).find(k => k.includes('mean'))] || 0) : 0;
                var max = res ? (res[Object.keys(res).find(k => k.includes('max'))] || 0) : 0;
                var cls = classifySalinity(mean);
                showResearchResult('<strong>🧂 نموذج الملوحة V4.3</strong><br>متوسط EC: ' + mean.toFixed(2) + ' dS/m<br>أقصى EC: ' + max.toFixed(2) + ' dS/m<br>التصنيف: ' + cls.level);
            });
        }

        else if (type === 'drought') {
            showLoading('جاري حساب مؤشر الجفاف...');
            var drought = calculateDroughtClassification(start, end, window.currentRegion);
            addResearcherLayer(drought, { min: 0, max: 1, palette: ['#8B0000', '#FF4500', '#FFA500', '#FFFF00', '#006400'] }, 'Drought_CDI');
            drought.reduceRegion({ reducer: ee.Reducer.mean(), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                hideLoading();
                var val = res ? (res[Object.keys(res)[0]] || 0) : 0;
                var cls = val < 0.2 ? '☠️ جفاف قصوى' : val < 0.4 ? '🔴 جفاف شديد' : val < 0.6 ? '🟠 جفاف متوسط' : val < 0.8 ? '🟡 جفاف خفيف' : '✅ لا جفاف';
                showResearchResult('<strong>🌵 مؤشر الجفاف الشامل (CDI)</strong><br>المتوسط: ' + val.toFixed(3) + '<br>التصنيف: ' + cls);
            });
        }

        else if (type === 'desert-risk') {
            showLoading('جاري حساب خطر التصحر...');
            var desert = calculateDesertRisk(start, end, window.currentRegion);
            addResearcherLayer(desert, { min: 0, max: 1, palette: ['#006400', '#ADFF2F', '#FFFF00', '#FFA500', '#FF0000'] }, 'Desertification_Risk');
            hideLoading();
            showResearchResult('✅ خريطة خطر التصحر - أحمر = خطر عالٍ، أخضر = آمن');
        }

        else if (type === 'soil-texture') {
            showLoading('جاري تحليل نسيج التربة...');
            var clay = ee.Image('OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02').select('b0').divide(10);
            var sand = ee.Image('OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02').select('b0').divide(10);
            var textureCode = clay.expression('(CLAY >= 40) ? 1 : (SAND >= 70) ? 2 : (SAND >= 50 && CLAY < 20) ? 3 : (CLAY >= 27 && CLAY < 40 && SAND >= 20) ? 4 : 5', { 'CLAY': clay, 'SAND': sand }).clip(window.currentRegion);
            addResearcherLayer(textureCode, { min: 1, max: 5, palette: ['#8B4513', '#DAA520', '#F5DEB3', '#90EE90', '#006400'] }, 'Soil_Texture');
            hideLoading();
            showResearchResult('✅ نسيج التربة: 🟤طين | 🟡طين رملي | 🌾رملي لومي | 🟩لومي | 🌲طين سلتي');
        }

        else if (type === 'carbon-stock') {
            showLoading('جاري حساب مخزون الكربون...');
            var ndvi = safeIndex(result, 'NDVI');
            var agb = ndvi.expression('((exp(1.9407 + 2.8363 * NDVI) - 1) / 0.1)', { 'NDVI': ndvi }).clamp(0, 150);
            var carbon = agb.multiply(0.47).rename('CarbonStock');
            addResearcherLayer(carbon.clip(window.currentRegion), { min: 0, max: 70, palette: ['#F5F5F5', '#FFE0B2', '#FF8F00', '#3E2723', '#1B5E20'] }, 'Carbon_Stock');
            carbon.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.sum(), '', true), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                hideLoading();
                if (!res) return;
                var mean = res.CarbonStock_mean || 0;
                var co2 = mean * 3.67;
                showResearchResult('<strong>🌱 مخزون الكربون</strong><br>المتوسط: ' + mean.toFixed(1) + ' طن C/هكتار<br>مكافئ CO₂: ' + co2.toFixed(1) + ' طن/هكتار');
            });
        }

        else if (type === 'carbon-change') {
            showLoading('جاري حساب تغيير الكربون...');
            var p1Start = document.getElementById('vis-p1-start') ? document.getElementById('vis-p1-start').value : '2015-01-01';
            var p1End = document.getElementById('vis-p1-end') ? document.getElementById('vis-p1-end').value : '2015-12-31';
            var col1 = getAnyCollection(sensor, p1Start, p1End, window.currentRegion);
            col1.size().evaluate(function (sz) {
                if (sz === 0) { hideLoading(); alert('لا توجد صور للفترة الأولى. حدد P1 في Visual Tools.'); return; }
                var res1 = col1.median().clip(window.currentRegion);
                var ndvi1 = safeIndex(res1, 'NDVI');
                var carbon1 = ndvi1.expression('((exp(1.9407 + 2.8363 * NDVI) - 1) / 0.1) * 0.47', { 'NDVI': ndvi1 }).clamp(0, 70);
                var ndvi2 = safeIndex(result, 'NDVI');
                var carbon2 = ndvi2.expression('((exp(1.9407 + 2.8363 * NDVI) - 1) / 0.1) * 0.47', { 'NDVI': ndvi2 }).clamp(0, 70);
                var change = carbon2.subtract(carbon1).rename('CarbonChange').clip(window.currentRegion);
                addResearcherLayer(change, { min: -20, max: 20, palette: ['#d73027', '#fc8d59', '#fee090', '#ffffff', '#91bfdb', '#4575b4'] }, 'Carbon_Change');
                change.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.sum(), '', true), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                    hideLoading();
                    if (!res) return;
                    var mean = res.CarbonChange_mean || 0;
                    var sum = (res.CarbonChange_sum || 0) / 1000;
                    var trend = mean > 0 ? '✅ ازدياد الكربون (امتصاص CO₂)' : '⚠️ فقدان الكربون (انبعاثات)';
                    showResearchResult('<strong>📊 تغيير الكربون</strong><br>متوسط التغير: ' + mean.toFixed(2) + ' طن/هكتار<br>المجموع: ' + sum.toFixed(1) + ' ألف طن C<br>' + trend);
                });
            });
        }

        else if (type === 'crop-yield') {
            showLoading('جاري حساب إنتاجية المحصول...');
            var cropType = document.getElementById('research-crop') ? document.getElementById('research-crop').value : 'Wheat';
            var ndviMax = col.map(function (img) { return safeIndex(img, 'NDVI'); }).max().clip(window.currentRegion);
            var ndviMean = col.map(function (img) { return safeIndex(img, 'NDVI'); }).mean().clip(window.currentRegion);
            var eviMean = col.map(function (img) { return safeIndex(img, 'EVI'); }).mean().clip(window.currentRegion);
            var lsCol = getMergedLandsatCollection(start, end, window.currentRegion);
            var lstMean = lsCol.select('LST').mean().clip(window.currentRegion);

            var yieldModels = {
                'Wheat': ndviMax.expression('(12.5 * NDVI - 1.5) * (1 - ((LST - 20) / 30) * 0.3)', { 'NDVI': ndviMax, 'LST': lstMean }).clamp(0, 8).rename('Yield'),
                'Maize': eviMean.expression('(15 * EVI + 2) * (1 - ((LST - 25) / 30) * 0.4)', { 'EVI': eviMean, 'LST': lstMean }).clamp(0, 10).rename('Yield'),
                'Rice': ndviMean.expression('(10 * NDVI + 1)', { 'NDVI': ndviMean }).clamp(0, 9).rename('Yield'),
                'Cotton': ndviMax.expression('(3000 * NDVI - 300) * (1 - ((LST - 28) / 25) * 0.3) / 1000', { 'NDVI': ndviMax, 'LST': lstMean }).clamp(0, 3.5).rename('Yield'),
                'Sugarcane': ndviMean.expression('(80 * NDVI + 10)', { 'NDVI': ndviMean }).clamp(0, 120).rename('Yield')
            };
            var yieldUnits = { 'Wheat': 'طن/هكتار (0-8)', 'Maize': 'طن/هكتار (0-10)', 'Rice': 'طن/هكتار (0-9)', 'Cotton': 'طن/هكتار (0-3.5)', 'Sugarcane': 'طن/هكتار (0-120)' };

            var yieldImg = (yieldModels[cropType] || yieldModels['Wheat']).clip(window.currentRegion);
            addResearcherLayer(yieldImg, { min: 0, max: cropType === 'Sugarcane' ? 120 : cropType === 'Maize' ? 10 : 8, palette: ['#FFCDD2', '#FFF9C4', '#C8E6C9', '#2E7D32'] }, 'Yield_' + cropType);

            yieldImg.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.min(), '', true).combine(ee.Reducer.max(), '', true), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                hideLoading();
                if (!res) return;
                var keys = Object.keys(res);
                var mean = res[keys.find(k => k.includes('mean'))] || 0;
                showResearchResult('<strong>🌾 تقدير إنتاجية ' + cropType + '</strong><br>المتوسط: ' + mean.toFixed(2) + ' ' + (yieldUnits[cropType] || 'طن/هكتار'));
            });
        }

        else if (type === 'yield-comparison') {
            showLoading('جاري مقارنة الإنتاجية بين موسمين...');
            var p1Start = document.getElementById('vis-p1-start') ? document.getElementById('vis-p1-start').value : '2015-01-01';
            var p1End = document.getElementById('vis-p1-end') ? document.getElementById('vis-p1-end').value : '2015-12-31';
            var cropType = document.getElementById('research-crop') ? document.getElementById('research-crop').value : 'Wheat';
            var col1 = getAnyCollection(sensor, p1Start, p1End, window.currentRegion);
            col1.size().evaluate(function (sz) {
                if (sz === 0) { hideLoading(); alert('لا توجد صور للموسم الأول. حدد P1.'); return; }
                var ndvi1 = col1.map(function (img) { return safeIndex(img, 'NDVI'); }).max().clip(window.currentRegion);
                var ndvi2 = col.map(function (img) { return safeIndex(img, 'NDVI'); }).max().clip(window.currentRegion);
                var y1 = ndvi1.expression('(12.5 * NDVI - 1.5)', { 'NDVI': ndvi1 }).clamp(0, 8);
                var y2 = ndvi2.expression('(12.5 * NDVI - 1.5)', { 'NDVI': ndvi2 }).clamp(0, 8);
                ee.Dictionary({ y1: y1.reduceRegion({ reducer: ee.Reducer.mean(), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }), y2: y2.reduceRegion({ reducer: ee.Reducer.mean(), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }) }).evaluate(function (res) {
                    hideLoading();
                    var v1 = res.y1[Object.keys(res.y1)[0]] || 0;
                    var v2 = res.y2[Object.keys(res.y2)[0]] || 0;
                    var diff = v2 - v1;
                    var trend = diff > 0 ? '✅ تحسن +' : '⚠️ تراجع ';
                    showResearchResult('<strong>📈 مقارنة الإنتاجية (' + cropType + ')</strong><br>موسم 1: ' + v1.toFixed(2) + ' طن/هكتار<br>موسم 2: ' + v2.toFixed(2) + ' طن/هكتار<br>' + trend + Math.abs(diff).toFixed(2) + ' طن/هكتار');
                });
            });
        }

        else if (type === 'wue') {
            showLoading('جاري حساب كفاءة استخدام المياه...');
            var ndvi = safeIndex(result, 'NDVI');
            var fPAR = ndvi.subtract(0.05).divide(0.90).clamp(0, 1);
            var npp = fPAR.multiply(30);
            var et = ee.ImageCollection('MODIS/006/MOD16A2').filterDate(start, end).filterBounds(window.currentRegion).select('ET').mean().multiply(0.1).clip(window.currentRegion);
            var wue = npp.divide(et.add(0.001)).multiply(1000).rename('WUE').clip(window.currentRegion);
            addResearcherLayer(wue, { min: 0, max: 5, palette: ['#FFCDD2', '#FFF9C4', '#A5D6A7', '#1B5E20'] }, 'WUE_Index');
            wue.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', true), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                hideLoading();
                if (!res) return;
                var mean = res.WUE_mean || 0;
                var std = res.WUE_stdDev || 0;
                var interp = mean > 3 ? '✅ كفاءة عالية' : mean > 1.5 ? '🟡 كفاءة متوسطة' : '❌ كفاءة منخفضة';
                showResearchResult('<strong>💧 كفاءة استخدام المياه (WUE)</strong><br>المتوسط: ' + mean.toFixed(3) + ' ± ' + std.toFixed(3) + ' g C/kg H₂O<br>التقييم: ' + interp);
            });
        }

        else if (type === 'heat-stress') {
            showLoading('جاري تقييم إجهاد الحرارة...');
            var cropType = document.getElementById('research-crop') ? document.getElementById('research-crop').value : 'Wheat';
            var thresholds = { 'Wheat': { opt: 20, stress: 30, severe: 35 }, 'Maize': { opt: 25, stress: 35, severe: 40 }, 'Rice': { opt: 28, stress: 35, severe: 40 }, 'Cotton': { opt: 28, stress: 36, severe: 42 }, 'Sugarcane': { opt: 30, stress: 38, severe: 43 } };
            var thresh = thresholds[cropType] || thresholds['Wheat'];
            var lsCol = getMergedLandsatCollection(start, end, window.currentRegion);
            var lstMean = lsCol.select('LST').mean().clip(window.currentRegion);
            var heatStress = lstMean.subtract(thresh.stress).clamp(0, 20).rename('HeatStress');
            addResearcherLayer(heatStress, { min: 0, max: 15, palette: ['#C8E6C9', '#FFF9C4', '#FFCC80', '#E64A19'] }, 'HeatStress_' + cropType);
            lstMean.reduceRegion({ reducer: ee.Reducer.mean().combine(ee.Reducer.max(), '', true), geometry: window.currentRegion, scale: 100, maxPixels: 1e8 }).evaluate(function (res) {
                hideLoading();
                if (!res) return;
                var lstVal = res.LST_mean || 0;
                var lstMax = res.LST_max || 0;
                var yieldLoss = Math.max(0, Math.min(100, (lstVal - thresh.stress) * 5));
                showResearchResult('<strong>🌡️ إجهاد الحرارة (' + cropType + ')</strong><br>متوسط درجة الحرارة: ' + lstVal.toFixed(1) + '°C<br>العتبة الحرجة: ' + thresh.stress + '°C<br>تقدير فقدان الإنتاج: ' + yieldLoss.toFixed(0) + '%');
            });
        }

        else if (type === 'threshold-mask') {
            var indexImg = safeIndex(result, index);
            var threshold = 0.3;
            var mask = indexImg.gt(threshold).selfMask().clip(window.currentRegion);
            addResearcherLayer(mask, { min: 0, max: 1, palette: ['red', 'green'] }, 'Threshold_Mask_' + index + '_>' + threshold);
            hideLoading();
            showResearchResult('✅ قناع العتبة: ' + index + ' > ' + threshold);
        }

        else if (type === 'export-image') {
            var indexImg = safeIndex(result, index);
            indexImg.getDownloadURL({ name: 'SAGE_' + index, region: window.currentRegion, scale: 30, format: 'GEO_TIFF' }, function (url) {
                hideLoading();
                if (url) { window.open(url, '_blank'); showResearchResult('✅ رابط تصدير الصورة مفتوح في تبويب جديد'); }
                else showResearchResult('❌ خطأ في التصدير - المنطقة كبيرة جداً. جرب نطاقاً أصغر.');
            });
        }

        else if (type === 'export-table') {
            var indexImg = safeIndex(result, index);
            var boundaries = ee.FeatureCollection('projects/ee-elsayedfarouk/assets/Egypt_GADM_Boundaries');
            var stats = indexImg.rename('value').reduceRegions({ collection: boundaries, reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', true), scale: 1000 });
            stats.limit(30).evaluate(function (res) {
                hideLoading();
                if (!res) { showResearchResult('❌ خطأ في التصدير'); return; }
                var csv = 'Governorate,Mean,StdDev\n';
                res.features.forEach(function (f) { csv += (f.properties.NAME_1 || '') + ',' + (f.properties.value_mean || 0).toFixed(4) + ',' + (f.properties.value_stdDev || 0).toFixed(4) + '\n'; });
                var blob = new Blob([csv], { type: 'text/csv' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'SAGE_' + index + '_stats.csv';
                link.click();
                showResearchResult('✅ تم تصدير الجدول CSV');
            });
        }

        else if (type === 'generate-report') {
            hideLoading();
            showResearchResult('<strong>📋 تقرير المنطقة</strong><br>المحافظة: ' + (document.getElementById('gov-select') ? document.getElementById('gov-select').value : '-') + '<br>الفترة: ' + start + ' إلى ' + end + '<br>المستشعر: ' + sensor + '<br>المؤشر المختار: ' + index + '<br>استخدم أزرار التحليل لملء التقرير.');
        }

        else {
            hideLoading();
            alert('هذه الميزة سيتم تفعيلها قريباً.');
        }
    });
}

// ====== SPLIT MAP COMPARISON ======
function showSplitMapComparison(p1Start, p1End, p2Start, p2End) {
    if (!window.map) { hideLoading(); alert('الخريطة غير متوفرة'); return; }
    var sensor = document.getElementById('sensor-select') ? document.getElementById('sensor-select').value : 'Landsat 8';
    var col1 = getAnyCollection(sensor, p1Start, p1End, window.currentRegion);
    var col2 = getAnyCollection(sensor, p2Start, p2End, window.currentRegion);

    col1.size().evaluate(function (sz1) {
        col2.size().evaluate(function (sz2) {
            if (sz1 === 0 || sz2 === 0) {
                hideLoading();
                alert('لا توجد صور لإحدى الفترتين!');
                return;
            }
            var img1 = col1.median().clip(window.currentRegion);
            var img2 = col2.median().clip(window.currentRegion);
            var vis = { min: 0, max: 0.3, bands: ['RED', 'GREEN', 'BLUE'], gamma: 1.3 };

            img1.getMap(vis, function (map1) {
                img2.getMap(vis, function (map2) {
                    hideLoading();
                    // Create split view overlay
                    var container = document.createElement('div');
                    container.id = 'split-map-overlay';
                    container.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:#000;display:flex;flex-direction:column;';
                    container.innerHTML =
                        '<div style="color:white;padding:8px;display:flex;justify-content:space-between;align-items:center;">' +
                        '<span>🔄 مقارنة الفترات: ' + p1Start.substr(0, 7) + ' vs ' + p2Start.substr(0, 7) + '</span>' +
                        '<button onclick="document.getElementById(\'split-map-overlay\').remove()" style="background:red;color:white;border:none;padding:4px 12px;cursor:pointer;">✕ إغلاق</button>' +
                        '</div>' +
                        '<div style="display:flex;flex:1;overflow:hidden;">' +
                        '<div style="flex:1;position:relative;">' +
                        '<div style="position:absolute;top:0;left:0;right:0;bottom:0;" id="sm-left"></div>' +
                        '<div style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;border-radius:4px;font-size:12px;">📅 ' + p1Start.substr(0, 7) + '</div>' +
                        '</div>' +
                        '<div style="width:4px;background:#fff;cursor:ew-resize;"></div>' +
                        '<div style="flex:1;position:relative;">' +
                        '<div style="position:absolute;top:0;left:0;right:0;bottom:0;" id="sm-right"></div>' +
                        '<div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;border-radius:4px;font-size:12px;">📅 ' + p2Start.substr(0, 7) + '</div>' +
                        '</div></div>' +
                        '<p style="color:#aaa;text-align:center;padding:4px;font-size:11px;">طبقات GEE يمكن فتح روابطها أدناه للمقارنة</p>';
                    document.body.appendChild(container);

                    // Add tile layers to mini maps
                    if (map1 && map1.urlFormat) {
                        var tileUrl1 = map1.urlFormat;
                        var link = document.createElement('a');
                        link.href = tileUrl1;
                        link.style.cssText = 'color:cyan;display:block;text-align:center;font-size:10px;';
                        link.textContent = 'رابط الطبقة الأولى (انسخ للمتصفح)';
                        link.target = '_blank';
                        container.appendChild(link);
                    }
                });
            });
        });
    });
}

// ====== TIME-LAPSE GIF ======
function showTimeLapseGIF() {
    if (!window.currentRegion) { hideLoading(); alert('يرجى اختيار محافظة أولاً!'); return; }
    var startYear = parseInt(document.getElementById('tl-start-year') ? document.getElementById('tl-start-year').value : 2000);
    var endYear = parseInt(document.getElementById('tl-end-year') ? document.getElementById('tl-end-year').value : 2023);
    var fps = parseInt(document.getElementById('tl-fps') ? document.getElementById('tl-fps').value : 4);

    if (startYear >= endYear) { hideLoading(); alert('السنة الأولى يجب أن تكون قبل السنة الأخيرة!'); return; }

    // Build annual mosaics
    var years = [];
    for (var y = startYear; y <= endYear; y++) years.push(y);

    var imgList = years.map(function (yr) {
        return getMergedLandsatCollection(yr + '-01-01', yr + '-12-31', window.currentRegion)
            .filter(ee.Filter.lte('CLOUD_COVER', 30)).median().clip(window.currentRegion)
            .visualize({ bands: ['RED', 'GREEN', 'BLUE'], min: 0, max: 0.25, gamma: 1.4 })
            .set({ 'year': yr, 'system:time_start': ee.Date(yr + '-01-01').millis() });
    });

    var gifCol = ee.ImageCollection(imgList);
    var gifParams = { dimensions: 500, region: window.currentRegion, framesPerSecond: fps, crs: 'EPSG:3857' };

    gifCol.getVideoThumbURL(gifParams, function (url) {
        hideLoading();
        if (url) {
            showStatsBox(
                '<strong>🎬 Time-Lapse GIF (' + startYear + '-' + endYear + ')</strong><br>' +
                '<img src="' + url + '" style="width:100%;margin-top:8px;border-radius:4px;" onerror="this.style.display=\'none\'">' +
                '<br><a href="' + url + '" target="_blank" style="color:#1565C0;">⬇️ فتح / تحميل الصورة المتحركة</a><br>' +
                '<small style="color:#888;">كليك يمين → "حفظ الصورة" لتحميل GIF</small>'
            );
        } else {
            showResearchResult('❌ فشل إنشاء GIF. المنطقة كبيرة جداً أو لا توجد صور. جرب منطقة أصغر أو نطاق سنوات أقصر.');
        }
    });
}

// ====== AI CLASSIFICATION (Random Forest) ======
function runAIClassification(start, end, sensor) {
    showLoading('جاري التصنيف بالذكاء الاصطناعي...');
    var base = getAnyCollection(sensor, start, end, window.currentRegion).median().clip(window.currentRegion);
    var ndvi = safeIndex(base, 'NDVI').rename('n');
    var ndwi = safeIndex(base, 'NDWI').rename('w');
    var ndbi = safeIndex(base, 'NDBI').rename('b');

    var hasBands = false;
    try {
        var input = base.select(['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']).addBands([ndvi, ndwi, ndbi]);
        hasBands = true;
    } catch (e) { }

    if (!hasBands) {
        input = base.addBands([ndvi, ndwi, ndbi]);
    }

    var trainingData = ee.Image(0)
        .where(ndwi.gt(0.1), 1)
        .where(ndvi.gt(0.35), 2)
        .where(ndbi.gt(0.1), 3)
        .where(ndvi.lt(0.15).and(ndwi.lt(0)).and(ndbi.lt(0)), 4)
        .rename('class');

    var points = input.addBands(trainingData).updateMask(trainingData.neq(0)).sample({
        region: window.currentRegion,
        scale: 100,
        numPixels: 1200,
        geometries: true,
        tileScale: 16
    });

    var withRandom = points.randomColumn('random');
    var trainingPartition = withRandom.filter(ee.Filter.lt('random', 0.7));
    var testingPartition = withRandom.filter(ee.Filter.gte('random', 0.7));

    var classifier = ee.Classifier.smileRandomForest(50).train({
        features: trainingPartition,
        classProperty: 'class',
        inputProperties: input.bandNames()
    });

    var classified = input.classify(classifier).clip(window.currentRegion);
    addResearcherLayer(classified, { min: 1, max: 4, palette: ['#0000FF', '#00AA00', '#FF4444', '#FFD700'] }, 'AI_Classification_RF');

    var test = testingPartition.classify(classifier);
    var confMatrix = test.errorMatrix('class', 'classification');

    ee.Dictionary({
        accuracy: confMatrix.accuracy(),
        kappa: confMatrix.kappa()
    }).evaluate(function (res) {
        hideLoading();
        var acc = res ? ((res.accuracy || 0) * 100).toFixed(1) : '?';
        var kap = res ? (res.kappa || 0).toFixed(3) : '?';
        showResearchResult(
            '<strong>🌲 تصنيف Random Forest</strong><br>' +
            '📊 دقة النموذج: <strong style="color:#1565C0;">' + acc + '%</strong><br>' +
            '📈 معامل Kappa: ' + kap + '<br>' +
            '🟦 ماء | 🟩 نباتات | 🟥 عمراني | 🟨 صحراء<br>' +
            '<small style="color:#888;">تم التدريب على 70% من البيانات، اختبار 30%</small>'
        );
    });
}


// ====== Map Download Handler ======
function downloadFarmMap() {
    if (!window.currentOpticalImage || !window.currentFarmArea) {
        alert('⚠️ لا توجد خريطة جاهزة للتحميل.');
        return;
    }

    var btn = document.getElementById('btn-download-map');
    var originalText = btn ? btn.innerText : '📥 تحميل صورة المزرعة';
    if (btn) btn.innerText = '⏳ جاري إنشاء الرابط...';

    var rgbVis = window.currentRgbVisParams || { min: 0, max: 0.3, bands: ['RED', 'GREEN', 'BLUE'] };
    var rgbImage = window.currentOpticalImage.visualize(rgbVis);

    rgbImage.getThumbURL({
        'dimensions': 1000,
        'region': window.currentFarmArea,
        'format': 'png'
    }, function (url) {
        if (btn) btn.innerText = originalText;
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('حدث خطأ أثناء إنشاء الصورة.');
        }
    });

    // Also offer GeoTIFF download via console or separate link if needed
    console.log('GeoTIFF Download URL:', rgbImage.getDownloadURL({
        name: 'Farm_RGB',
        region: window.currentFarmArea,
        scale: window.currentOpticalScale || 10,
        format: 'GEO_TIFF'
    }));
}

// ====== Initialization ======
// All initialization is now handled by auth.js on successful login.
// This ensures that ee.initialize is only called AFTER a valid token is obtained.
// The mapClickEnabled variable is set here to ensure it's available.
window.mapClickEnabled = false;












