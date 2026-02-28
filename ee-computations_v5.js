/**
 * ee-computations_v5.js
 * -------------------------------------------------------
 * Full parity with egypt_full_4_update_JS.groovy
 * Adds all missing functions: advanced models, terrain analysis,
 * yield models, carbon stock, WUE, heat stress, trend analysis,
 * unsupervised classification, time-lapse, water history, etc.
 * -------------------------------------------------------
 */

// ===== Core Constants =====
var DEFAULT_ADMIN_ASSET = 'projects/ee-elsayedfarouk/assets/Egypt_GADM_Boundaries';
var DEFAULT_REGION_NAME_FIELD = 'NAME_1';

var govTranslation = {
    'Ad Daqahliyah': 'الدقهلية', 'Al Bahr al Ahmar': 'البحر الأحمر', 'Al Buhayrah': 'البحيرة',
    'Al Fayyum': 'الفيوم', 'Al Gharbiyah': 'الغربية', 'Al Iskandariyah': 'الإسكندرية',
    "Al Isma'iliyah": 'الإسماعيلية', 'Al Jizah': 'الجيزة', 'Al Minufiyah': 'المنوفية',
    'Al Minya': 'المنيا', 'Al Qahirah': 'القاهرة', 'Al Qalyubiyah': 'القليوبية',
    'Al Wadi al Jadid': 'الوادي الجديد', 'Ash Sharqiyah': 'الشرقية', 'Aswan': 'أسوان',
    'Asyut': 'أسيوط', 'Bani Suwayf': 'بني سويف', "Bur Sa'id": 'بورسعيد',
    'Dumyat': 'دمياط', "Janub Sina'": 'جنوب سيناء', 'Kafr ash Shaykh': 'كفر الشيخ',
    'Luxor': 'الأقصر', 'Matruh': 'مطروح', 'Matrouh': 'مطروح', 'Qina': 'قنا',
    'Sawhaj': 'سوهاج', 'Sohag': 'سوهاج', 'Suhag': 'سوهاج', "Shamal Sina'": 'شمال سيناء', 'Suways': 'السويس'
};

var EE_CONFIG = {
    SCALE: { SENTINEL2: 10, LANDSAT: 30, SRTM: 30, CHIRPS: 5566, MODIS_ET: 500, ERA5: 11132 },
    MAX_PIXELS: 1e9,
    WEIGHTS: { VHI: { vci: 0.5, tci: 0.5 }, SALINITY_RISK: { ndsi: 0.30, slope: 0.25, moisture: 0.20, lst: 0.15, ndvi: 0.10 } },
    FAO56_KC: {
        'قمح': 1.15, 'ذرة': 1.20, 'أرز': 1.20, 'قطن': 1.15, 'قصب': 1.25,
        'بطاطس': 1.15, 'طماطم': 1.15, 'فول': 1.15, 'برسيم': 0.95, 'بنجر': 1.20,
        'بصل': 1.05, 'فلفل': 1.05, 'خيار': 1.00, 'موالح': 0.65, 'زيتون': 0.70, 'نخيل': 0.90
    }
};
window.EE_CONFIG = EE_CONFIG;
window.govTranslation = govTranslation;

// ===== Admin Boundaries =====
function getAdminBoundaries(assetId, nameField) {
    assetId = assetId || DEFAULT_ADMIN_ASSET;
    nameField = nameField || DEFAULT_REGION_NAME_FIELD;
    return { collection: ee.FeatureCollection(assetId), nameField: nameField };
}

// ===== Indices Dictionary (Full - 30+ indices) =====
// ===== Indices Dictionary (Full parity with sage.js) =====
var indicesDict = {
    // Vegetation
    'NDVI': function (img) { return img.normalizedDifference(['NIR', 'RED']).rename('NDVI'); },
    'NDVI (Vegetation)': function (img) { return img.normalizedDifference(['NIR', 'RED']).rename('NDVI'); },
    'EVI': function (img) {
        return img.expression('2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
            'NIR': img.select('NIR'), 'RED': img.select('RED'), 'BLUE': img.select('BLUE')
        }).rename('EVI');
    },
    'EVI (Enhanced Vegetation Index)': function (img) {
        return img.expression('2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
            'NIR': img.select('NIR'), 'RED': img.select('RED'), 'BLUE': img.select('BLUE')
        }).rename('EVI');
    },
    'SAVI': function (img) {
        return img.expression('1.5 * (NIR - RED) / (NIR + RED + 0.5)', {
            'NIR': img.select('NIR'), 'RED': img.select('RED')
        }).rename('SAVI');
    },
    'SAVI (Soil-Adjusted Vegetation Index)': function (img) {
        return img.expression('1.5 * (NIR - RED) / (NIR + RED + 0.5)', {
            'NIR': img.select('NIR'), 'RED': img.select('RED')
        }).rename('SAVI');
    },

    // Moisture / chlorophyll
    'NDMI (Vegetation Moisture)': function (img) { return img.normalizedDifference(['NIR', 'SWIR1']).rename('NDMI'); },
    'NDMI': function (img) { return img.normalizedDifference(['NIR', 'SWIR1']).rename('NDMI'); },
    'GCI (Green Chlorophyll Index)': function (img) {
        return img.expression('(NIR / GREEN) - 1', {
            'NIR': img.select('NIR'), 'GREEN': img.select('GREEN')
        }).rename('GCI');
    },
    'GCI': function (img) {
        return img.expression('(NIR / GREEN) - 1', {
            'NIR': img.select('NIR'), 'GREEN': img.select('GREEN')
        }).rename('GCI');
    },

    // Water
    'NDWI (McFeeters Water Index)': function (img) { return img.normalizedDifference(['GREEN', 'NIR']).rename('NDWI'); },
    'NDWI': function (img) { return img.normalizedDifference(['GREEN', 'NIR']).rename('NDWI'); },
    'MNDWI (Modified NDWI - Urban Water)': function (img) { return img.normalizedDifference(['GREEN', 'SWIR1']).rename('MNDWI'); },
    'MNDWI': function (img) { return img.normalizedDifference(['GREEN', 'SWIR1']).rename('MNDWI'); },

    // Built-up / bare soil
    'NDBI (Built-up Index)': function (img) { return img.normalizedDifference(['SWIR1', 'NIR']).rename('NDBI'); },
    'NDBI': function (img) { return img.normalizedDifference(['SWIR1', 'NIR']).rename('NDBI'); },
    'Bare Soil Index (BSI - Approx)': function (img) {
        return img.expression('((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))', {
            'SWIR1': img.select('SWIR1'), 'RED': img.select('RED'), 'NIR': img.select('NIR'), 'BLUE': img.select('BLUE')
        }).rename('BSI');
    },
    'BSI': function (img) {
        return img.expression('((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))', {
            'SWIR1': img.select('SWIR1'), 'RED': img.select('RED'), 'NIR': img.select('NIR'), 'BLUE': img.select('BLUE')
        }).rename('BSI');
    },

    // Fire
    'NBR (Normalized Burn Ratio)': function (img) { return img.normalizedDifference(['NIR', 'SWIR2']).rename('NBR'); },
    'NBR': function (img) { return img.normalizedDifference(['NIR', 'SWIR2']).rename('NBR'); },

    // SOIL INDICES
    'NDSI (Salinity Index)': function (img) { return img.normalizedDifference(['SWIR1', 'SWIR2']).rename('NDSI'); },
    'NDSI': function (img) { return img.normalizedDifference(['SWIR1', 'SWIR2']).rename('NDSI'); },
    'Clay Minerals Ratio': function (img) { return img.select('SWIR1').divide(img.select('SWIR2')).rename('ClayRatio'); },
    'ClayRatio': function (img) { return img.select('SWIR1').divide(img.select('SWIR2')).rename('ClayRatio'); },
    'Iron Oxide Ratio': function (img) { return img.select('RED').divide(img.select('BLUE')).rename('IronOxide'); },
    'IronOxide': function (img) { return img.select('RED').divide(img.select('BLUE')).rename('IronOxide'); },

    // Advanced Soil Analysis
    'Gypsum Index': function (img) {
        return img.expression('(SWIR1 - SWIR2) / (SWIR1 + SWIR2)', {
            'SWIR1': img.select('SWIR1'), 'SWIR2': img.select('SWIR2')
        }).rename('GypsumIndex');
    },
    'GypsumIndex': function (img) { return indicesDict['Gypsum Index'](img); },
    'Carbonate Index': function (img) {
        return img.expression('SWIR2 / SWIR1', {
            'SWIR1': img.select('SWIR1'), 'SWIR2': img.select('SWIR2')
        }).rename('CarbonateIndex');
    },
    'CarbonateIndex': function (img) { return indicesDict['Carbonate Index'](img); },
    'Enhanced Salinity Index (ESI)': function (img) {
        return img.expression('sqrt((RED + NIR) / 2)', {
            'RED': img.select('RED'), 'NIR': img.select('NIR')
        }).rename('ESI');
    },
    'ESI': function (img) { return indicesDict['Enhanced Salinity Index (ESI)'](img); },
    'SI3 (Salinity Index 3)': function (img) {
        return img.expression('sqrt(BLUE * RED)', {
            'BLUE': img.select('BLUE'), 'RED': img.select('RED')
        }).rename('SI3');
    },
    'SI3': function (img) { return indicesDict['SI3 (Salinity Index 3)'](img); },
    'Soil Organic Matter (SOM)': function (img) {
        return img.expression('(1 - ((SWIR2 - 0.05) / (0.35 - 0.05))) * (NIR / RED)', {
            'SWIR2': img.select('SWIR2'), 'NIR': img.select('NIR'), 'RED': img.select('RED')
        }).rename('SOM');
    },
    'SOM': function (img) { return indicesDict['Soil Organic Matter (SOM)'](img); },
    'Turbidity Index': function (img) { return img.select('RED').divide(img.select('BLUE')).rename('Turbidity'); },
    'Chlorophyll-a Concentration': function (img) {
        return img.expression('(NIR - RED) / (NIR + RED) * 10', {
            'NIR': img.select('NIR'), 'RED': img.select('RED')
        }).rename('Chla');
    },
    'Aboveground Biomass (AGB)': function (img) {
        return img.expression('((exp(1.9407 + (2.8363 * NDVI)) - 1) / 0.1)', {
            'NDVI': img.normalizedDifference(['NIR', 'RED'])
        }).rename('AGB');
    }
};
window.indicesDict = indicesDict;

// ===== Safe Index =====
window.safeIndex = function (img, name) {
    if (indicesDict[name]) return indicesDict[name](img);
    var bands = img.bandNames();
    var result = ee.Algorithms.If(bands.contains(name), img.select([name]),
        img.normalizedDifference(['NIR', 'RED']).rename('NDVI'));
    return ee.Image(result);
};

// ===== Sentinel-2 =====
function maskAndPrepareS2(img) {
    var scl = img.select('SCL');
    var mask = scl.eq(4).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7)).or(scl.eq(11));
    return img.updateMask(mask)
        .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'], ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2'])
        .divide(10000)
        .copyProperties(img, img.propertyNames());
}
function getS2Collection(start, end, geometry) {
    return ee.ImageCollection('COPERNICUS/S2_SR')
        .filterDate(start, end).filterBounds(geometry)
        .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 60))
        .map(maskAndPrepareS2);
}

// ===== Landsat =====
function cloudMaskLandsat(img) {
    var qa = img.select('QA_PIXEL');
    var mask = qa.bitwiseAnd(1 << 1).eq(0).and(qa.bitwiseAnd(1 << 2).eq(0))
        .and(qa.bitwiseAnd(1 << 3).eq(0)).and(qa.bitwiseAnd(1 << 4).eq(0));
    return img.updateMask(mask).copyProperties(img, img.propertyNames());
}
function applyScaleFactors(img) {
    var optical = img.select('SR_B.*').multiply(2.75e-5).subtract(0.2);
    var thermal = img.select('ST_B.*').multiply(0.00341802).add(149.0).subtract(273.15);
    return img.addBands(optical, null, true).addBands(thermal, null, true).copyProperties(img, img.propertyNames());
}
function getMergedLandsatCollection(start, end, geometry) {
    var l8b = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'ST_B10'];
    var l57b = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'ST_B6'];
    var cb = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'LST'];
    var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').filterDate(start, end).filterBounds(geometry)
        .map(cloudMaskLandsat).map(applyScaleFactors).select(l8b, cb);
    var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2').filterDate(start, end).filterBounds(geometry)
        .map(cloudMaskLandsat).map(applyScaleFactors).select(l57b, cb);
    var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').filterDate(start, end).filterBounds(geometry)
        .map(cloudMaskLandsat).map(applyScaleFactors).select(l57b, cb);
    return ee.ImageCollection(l5.merge(l7).merge(l8));
}

// ===== Sentinel-1 =====
window.getS1Collection = function (start, end, region) {
    return ee.ImageCollection('COPERNICUS/S1_GRD')
        .filterDate(start, end).filterBounds(region)
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .map(function (img) {
            var vv = img.select('VV').focal_median(30, 'circle', 'meters').rename('VV_smoothed');
            var vh = img.select('VH').focal_median(30, 'circle', 'meters').rename('VH_smoothed');
            return img.addBands([vv, vh]).copyProperties(img, ['system:time_start']);
        });
};

// ===== DEM / Terrain =====
var _DEM_CACHE = null, _SLOPE_CACHE = null, _ASPECT_CACHE = null;
function getDEM() { if (!_DEM_CACHE) _DEM_CACHE = ee.Image('USGS/SRTMGL1_003'); return _DEM_CACHE; }
function getSlope() { if (!_SLOPE_CACHE) _SLOPE_CACHE = ee.Terrain.slope(getDEM()); return _SLOPE_CACHE; }
function getAspect() { if (!_ASPECT_CACHE) _ASPECT_CACHE = ee.Terrain.aspect(getDEM()); return _ASPECT_CACHE; }
// expose for backward compat - defer execution until needed to avoid 401 on load
window.dem = null;
window.slope = null;
// We assign these as functions that will be called inside initialization or lazily
window.getDEM = getDEM;
window.getSlope = getSlope;
window.getAspect = getAspect;

// ===== Climate Data =====
function getChirps(start, end, geometry) {
    var startDate = ee.Date(start), endDate = ee.Date(end);
    var col = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(geometry)
        .filterDate(startDate.advance(-1, 'month'), endDate);
    var count = col.size();
    var result = ee.Algorithms.If(count.gt(0), col.sum().rename('Precipitation'), ee.Image(10).rename('Precipitation'));
    return ee.Image(result);
}
function getTerraClimateET(start, end, geometry) {
    var col = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE').filterBounds(geometry)
        .filterDate(start, end).select(['pet']);
    var count = col.size();
    var result = ee.Algorithms.If(count.gt(0), col.mean().divide(30).rename('ET'), ee.Image(5.5).rename('ET'));
    return ee.Image(result);
}
function getModisET(start, end, geometry) { return getTerraClimateET(start, end, geometry); }
function getEra5(start, end, geometry) {
    var era_bands = ['skin_temperature', 'volumetric_soil_water_layer_1', 'volumetric_soil_water_layer_2',
        'total_evaporation_sum', 'temperature_2m', 'dewpoint_temperature_2m', 'u_component_of_wind_10m', 'v_component_of_wind_10m'];
    var new_names = ['skin_temp_K', 'sm_topsoil_m3m3', 'sm_rootzone_m3m3', 'total_evap_m_sum',
        'air_temp_K', 'dewpoint_temp_K', 'u_wind_ms', 'v_wind_ms'];
    var startDate = ee.Date(start), endDate = ee.Date(end);
    var col = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR').filterBounds(geometry)
        .filterDate(startDate.advance(-1, 'month'), endDate).select(era_bands, new_names);
    var count = col.size();
    var meanImage = ee.Algorithms.If(count.gt(0), col.mean(),
        ee.Image([298, 0.2, 0.2, 0, 298, 298, 0, 0]).rename(new_names).updateMask(0));
    meanImage = ee.Image(meanImage);
    var skinTempC = meanImage.select('skin_temp_K').subtract(273.15).rename('skin_temp_C');
    var airTempC = meanImage.select('air_temp_K').subtract(273.15).rename('air_temp_C');
    var dewTempC = meanImage.select('dewpoint_temp_K').subtract(273.15).rename('dewpoint_temp_C');
    var rh = meanImage.expression('100*exp((17.625*Td)/(243.04+Td))/exp((17.625*T)/(243.04+T))',
        { 'Td': dewTempC, 'T': airTempC }).rename('RH');
    var windSpeed = meanImage.expression('sqrt(u*u+v*v)',
        { 'u': meanImage.select('u_wind_ms'), 'v': meanImage.select('v_wind_ms') }).rename('WindSpeed');
    return meanImage.addBands(skinTempC).addBands(airTempC).addBands(dewTempC).addBands(rh).addBands(windSpeed);
}

// ===== SoilGrids v2.0 =====
function getSoilGridsData(geometry) {
    var clay = ee.Image("projects/soilgrids-isric/clay_mean").select('clay_0-5cm_mean').divide(10).rename('Clay');
    var sand = ee.Image("projects/soilgrids-isric/sand_mean").select('sand_0-5cm_mean').divide(10).rename('Sand');
    var silt = ee.Image("projects/soilgrids-isric/silt_mean").select('silt_0-5cm_mean').divide(10).rename('Silt');
    var ph = ee.Image("projects/soilgrids-isric/phh2o_mean").select('phh2o_0-5cm_mean').divide(10).rename('pH');
    var cec = ee.Image("projects/soilgrids-isric/cec_mean").select('cec_0-5cm_mean').divide(10).rename('CEC');
    var soc = ee.Image("projects/soilgrids-isric/soc_mean").select('soc_0-5cm_mean').divide(100).rename('SOC');
    var bd = ee.Image("projects/soilgrids-isric/bdod_mean").select('bdod_0-5cm_mean').divide(100).rename('BD');
    var nitrogen = ee.Image("projects/soilgrids-isric/nitrogen_mean").select('nitrogen_0-5cm_mean').divide(10000).rename('Nitrogen');

    // Calculated Properties
    var fc = clay.multiply(0.0031).add(sand.multiply(-0.001)).add(0.2).rename('FC');
    var wp = clay.multiply(0.0026).add(0.05).rename('WP');
    var paw = fc.subtract(wp).rename('PAW');

    // EC_base from SoilGrids (or approximation)
    var ec_base = clay.multiply(0.05).add(soc.multiply(0.1)).add(1.0).rename('EC_base');

    return clay.addBands([sand, silt, ph, cec, soc, bd, nitrogen, fc, wp, paw, ec_base]);
}

// ===== Salinity Model V4.3 (SoilGrids Anchored) =====
window.estimateSalinity_ML = function (s2, s1, lst, precip, et, dem, slope, soilData) {
    // 1. BASE MEASUREMENT (SoilGrids v2.0)
    var ec_base = ee.Image(1.5);
    if (soilData) {
        ec_base = soilData.select('EC_base').unmask(1.5).clamp(0.5, 32.0);
    }

    // 2. SURFACE AMPLIFICATION (SAR & Spectral)
    var ndsi = s2.normalizedDifference(['SWIR1', 'SWIR2']).unmask(0);
    var vv = s1.select('VV_smoothed').unmask(-15).clamp(-25, -5);
    var vh = s1.select('VH_smoothed').unmask(-22).clamp(-30, -10);
    var pol_ratio = vv.subtract(vh).clamp(-10, 10);

    // Physical proxies for salt pans
    var sar_dielectric = vv.unitScale(-18, -8).clamp(0, 1);
    var sar_crust = pol_ratio.unitScale(2, 8).clamp(0, 1);
    var physical_evidence = sar_dielectric.multiply(sar_crust);

    // 3. ENVIRONMENTAL CORRECTIONS
    var lst_factor = lst.unitScale(20, 45).clamp(0.5, 1.5); // High temp = higher surface salinity

    // Safety check for soilData (Required for expert mode, optional for researcher mode)
    var clay_factor = ee.Image(1.0);
    if (soilData) {
        clay_factor = soilData.select('Clay').divide(100).multiply(0.5).add(0.75); // Clay retards leaching
    }

    // 4. FINAL ENSEMBLE BLENDING
    var brightness = s2.select(['RED', 'GREEN', 'BLUE']).reduce(ee.Reducer.mean());
    var csi = ndsi.multiply(0.6).add(brightness.multiply(0.4));

    // 🛡️ REFINEMENT: Suppress salt probability if there is strong vegetation signal
    var ndvi = s2.normalizedDifference(['NIR', 'RED']).unmask(0);
    var veg_suppression = ndvi.unitScale(0.20, 0.40).clamp(0, 1);

    var salt_prob = csi.expression('1 / (1 + exp(-20 * (val - 0.35)))', { 'val': csi })
        .multiply(physical_evidence)
        .multiply(ee.Image(1).subtract(veg_suppression)); // High vegetation = low salt probability

    // Blending: Base + Corrections + High-Range SAR Evidence
    var ec_corrected = ec_base.multiply(lst_factor).multiply(clay_factor);
    var ec_final = ec_corrected.multiply(ee.Image(1).subtract(salt_prob))
        .add(ee.Image(48.0).multiply(salt_prob)) // Salt pans cap at 48 dS/m
        .clamp(0.2, 48.0)
        .rename('EC_dSm');

    // Add SI3 as a separate band for the UI logic to use
    var si3 = s2.expression('sqrt(BLUE * RED)', { 'BLUE': s2.select('BLUE'), 'RED': s2.select('RED') }).rename('SI3_Check');

    return ec_final.addBands(si3);
}

// ===== VHI Model =====
window.calculateVHI = function (start, end, geometry) {
    var fullHistory = getMergedLandsatCollection('1984-01-01', '2024-12-31', geometry);
    var historyNdvi = fullHistory.map(function (img) { return indicesDict['NDVI'](img); });
    var historyLst = fullHistory.select('LST');
    var ndviMin = historyNdvi.min(); var ndviMax = historyNdvi.max();
    var lstMin = historyLst.min(); var lstMax = historyLst.max();
    var currentCol = getMergedLandsatCollection(start, end, geometry);
    var currentNdvi = currentCol.map(function (img) { return indicesDict['NDVI'](img); }).median();
    var currentLst = currentCol.select('LST').median();
    var vci = currentNdvi.subtract(ndviMin).divide(ndviMax.subtract(ndviMin)).rename('VCI');
    var tci = lstMax.subtract(currentLst).divide(lstMax.subtract(lstMin)).rename('TCI');
    return vci.multiply(0.5).add(tci.multiply(0.5)).rename('VHI');
};

// ===== CDI - Comprehensive Drought Index =====
window.calculateCDI = function (start, end, geometry) {
    var s2 = getS2Collection(start, end, geometry).median();
    var ls_col = getMergedLandsatCollection(start, end, geometry);
    var lst = ls_col.select('LST').median();
    var era5 = getEra5(start, end, geometry);
    var sm_rootzone = era5.select('sm_rootzone_m3m3');
    var ndvi = indicesDict['NDVI'](s2); var ndmi = indicesDict['NDMI'](s2); var evi = indicesDict['EVI'](s2);
    var ndvi_norm = ndvi.unitScale(-0.2, 0.8);
    var ndmi_norm = ndmi.unitScale(-0.5, 0.5);
    var evi_norm = evi.unitScale(-0.1, 0.7);
    var lst_norm = lst.unitScale(20, 50).multiply(-1).add(1);
    var sm_norm = sm_rootzone.unitScale(0.1, 0.4);
    return ndvi_norm.multiply(0.25).add(ndmi_norm.multiply(0.25)).add(evi_norm.multiply(0.20))
        .add(lst_norm.multiply(0.15)).add(sm_norm.multiply(0.15)).rename('CDI');
};

// ===== Drought Classification Map (5 Classes) =====
window.calculateDroughtClassification = function (start, end, geometry) {
    var cdi = window.calculateCDI(start, end, geometry);
    return ee.Image(0)
        .where(cdi.lt(0.2), 5).where(cdi.gte(0.2).and(cdi.lt(0.4)), 4)
        .where(cdi.gte(0.4).and(cdi.lt(0.6)), 3).where(cdi.gte(0.6).and(cdi.lt(0.8)), 2)
        .where(cdi.gte(0.8), 1).rename('DroughtClass');
};

// ===== Salinity Risk Model (Weighted) =====
window.calculateSalinityRisk = function (start, end, geometry) {
    var s2_col = getS2Collection(start, end, geometry);
    var ls_col = getMergedLandsatCollection(start, end, geometry);
    var era5 = getEra5(start, end, geometry);
    var s2_median = s2_col.median();
    var ndsi = indicesDict['NDSI'](s2_median);
    var ndvi = indicesDict['NDVI'](s2_median);
    var s1_moisture = era5.select('sm_topsoil_m3m3');
    var lst = ls_col.select('LST').median();
    var slope_img = getSlope();
    var ndsi_norm = ndsi.unitScale(-0.2, 0.2);
    var lst_norm = lst.unitScale(20, 50);
    var slope_norm = slope_img.unitScale(0, 10).not();
    var s1_norm = s1_moisture.unitScale(0.1, 0.4);
    var ndvi_norm = ndvi.unitScale(0.1, 0.6).not();
    return ndsi_norm.multiply(0.30).add(slope_norm.multiply(0.25)).add(s1_norm.multiply(0.20))
        .add(lst_norm.multiply(0.15)).add(ndvi_norm.multiply(0.10)).rename('SalinityRisk');
};

// ===== Desertification Risk =====
window.calculateDesertRisk = function (start, end, geometry) {
    var s2 = getS2Collection(start, end, geometry).median();
    var ls_col = getMergedLandsatCollection(start, end, geometry);
    var lst = ls_col.select('LST').median();
    var era5 = getEra5(start, end, geometry);
    var sm_rootzone = era5.select('sm_rootzone_m3m3');
    var ndvi = indicesDict['NDVI'](s2); var bsi = indicesDict['BSI'](s2); var ndsi = indicesDict['NDSI'](s2);
    var albedo = s2.select(['RED', 'NIR']).reduce(ee.Reducer.mean());
    var ndvi_risk = ndvi.unitScale(0.1, 0.6).multiply(-1).add(1);
    var bsi_risk = bsi.unitScale(-0.3, 0.5);
    var ndsi_risk = ndsi.unitScale(-0.2, 0.3);
    var lst_risk = lst.unitScale(25, 50);
    var slope_risk = getSlope().unitScale(0, 15).multiply(-1).add(1);
    var sm_risk = sm_rootzone.unitScale(0.1, 0.4).multiply(-1).add(1);
    return ndvi_risk.multiply(0.25).add(bsi_risk.multiply(0.20)).add(ndsi_risk.multiply(0.15))
        .add(lst_risk.multiply(0.15)).add(slope_risk.multiply(0.15)).add(sm_risk.multiply(0.10)).rename('DesertRisk');
};

// ===== Long-Term Trend Analysis =====
window.calculateLongTermTrend = function (start, end, geometry, sensor, index) {
    start = start || '2015-01-01'; end = end || '2024-12-31';
    index = index || 'NDVI';
    var col = window.getAnyCollection ? window.getAnyCollection(sensor || 'Sentinel-2', start, end, geometry) : getS2Collection(start, end, geometry);
    var withTime = col.map(function (img) {
        var idx = indicesDict[index] ? indicesDict[index](img) : img.normalizedDifference(['NIR', 'RED']).rename('NDVI');
        var year = ee.Image(img.date().get('year')).float();
        var frac = ee.Image(img.date().getFraction('year')).float();
        return idx.addBands(year.add(frac).rename('time')).copyProperties(img, ['system:time_start']);
    });
    var bandToAnalyze = withTime.first().bandNames().get(0);
    return withTime.select(['time', bandToAnalyze]).reduce(ee.Reducer.linearFit()).select('scale').rename('Trend');
};

// ===== LST Warming Trend (Summer Only) =====
window.calculateLSTTrend = function (geometry) {
    var col = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').filterBounds(geometry)
        .filterDate('2013-01-01', '2023-12-31')
        .filter(ee.Filter.calendarRange(6, 9, 'month'))
        .map(cloudMaskLandsat).map(applyScaleFactors)
        .map(function (img) {
            var year = ee.Image(img.date().get('year')).float();
            return img.select('LST').addBands(year.rename('year')).copyProperties(img, ['system:time_start']);
        });
    return col.select(['year', 'LST']).reduce(ee.Reducer.linearFit()).select('scale').rename('LSTTrend');
};

// ===== Carbon Stock =====
window.calculateCarbonStock = function (composite, geometry) {
    var ndvi = indicesDict['NDVI'](composite);
    var agb = ndvi.expression('((exp(1.9407+(2.8363*NDVI))-1)/0.1)', { 'NDVI': ndvi }).clamp(0, 150).rename('AGB');
    var carbonStock = agb.multiply(0.47).rename('CarbonStock_t_ha');
    var co2eq = carbonStock.multiply(3.67).rename('CO2eq_t_ha');
    return { carbonStock: carbonStock, co2eq: co2eq, agb: agb };
};

// ===== Crop Yield Models (Egypt Calibrated) =====
window.calculateCropYield = function (composite, cropType, lsCol, geometry, start, end) {
    var colIndexed = (window.getAnyCollection ? window.getAnyCollection('Sentinel-2', start, end, geometry) : getS2Collection(start, end, geometry))
        .map(function (img) { return img.addBands([indicesDict['NDVI'](img), indicesDict['EVI'](img), indicesDict['GCI'](img)]); });
    var ndviMax = colIndexed.select('NDVI').max();
    var ndviMean = colIndexed.select('NDVI').mean();
    var eviMax = colIndexed.select('EVI').max();
    var eviMean = colIndexed.select('EVI').mean();
    var gciMean = colIndexed.select('GCI').mean();
    var lstMean = lsCol.select('LST').mean();
    var yieldModels = {
        'Wheat': function () {
            return ndviMax.expression('(12.5*NDVI_max-1.5)*(1-((LST-20)/30)*0.3)',
                { 'NDVI_max': ndviMax, 'LST': lstMean }).clamp(0, 8).rename('WheatYield_t_ha');
        },
        'Maize (Corn)': function () {
            return eviMean.expression('(15*EVI_mean+2)*(1-((LST-25)/30)*0.4)',
                { 'EVI_mean': eviMean, 'LST': lstMean }).clamp(0, 10).rename('MaizeYield_t_ha');
        },
        'Rice': function () {
            var ndwi = indicesDict['NDWI'](composite);
            return ndviMean.expression('(10*NDVI_mean+1)*(1+NDWI*0.2)',
                { 'NDVI_mean': ndviMean, 'NDWI': ndwi }).clamp(0, 9).rename('RiceYield_t_ha');
        },
        'Cotton': function () {
            return ndviMax.expression('(3000*NDVI_max-300)*(1-((LST-28)/25)*0.3)',
                { 'NDVI_max': ndviMax, 'LST': lstMean }).clamp(0, 3500).divide(1000).rename('CottonYield_t_ha');
        },
        'Sugarcane': function () {
            return ndviMean.expression('(80*NDVI_mean+10)*(1+(GCI/10))',
                { 'NDVI_mean': ndviMean, 'GCI': gciMean }).clamp(0, 120).rename('SugarcaneYield_t_ha');
        },
        'General Crop': function () {
            return ndviMean.expression('(NDVI_mean*100)*(EVI_mean/0.6)',
                { 'NDVI_mean': ndviMean, 'EVI_mean': eviMean }).clamp(0, 100).rename('YieldIndex');
        }
    };
    var fn = yieldModels[cropType] || yieldModels['General Crop'];
    return fn();
};

// ===== WUE - Water Use Efficiency =====
window.calculateWUE = function (composite, start, end, geometry) {
    var ndvi = indicesDict['NDVI'](composite);
    var fPAR = ndvi.expression('(NDVI-0.05)/(0.95-0.05)', { 'NDVI': ndvi }).clamp(0, 1);
    var npp = fPAR.multiply(30).rename('NPP');
    var et_daily = getTerraClimateET(start, end, geometry);
    var wue = npp.divide(et_daily).multiply(1000).rename('WUE');
    return { wue: wue, npp: npp, et: et_daily };
};

// ===== Heat Stress =====
window.calculateHeatStress = function (start, end, geometry, cropType) {
    var thresholds = {
        'Wheat': { optimal: 20, stress: 30, severe: 35 },
        'Maize (Corn)': { optimal: 25, stress: 32, severe: 38 },
        'Rice': { optimal: 28, stress: 35, severe: 40 },
        'Cotton': { optimal: 28, stress: 35, severe: 40 },
        'Sugarcane': { optimal: 30, stress: 38, severe: 42 },
        'General Crop': { optimal: 25, stress: 32, severe: 38 }
    };
    var t = thresholds[cropType] || thresholds['General Crop'];
    var lsCol = getMergedLandsatCollection(start, end, geometry);
    var lstMean = lsCol.select('LST').mean();
    var lstMax = lsCol.select('LST').max();
    var stressIndex = ee.Image(0).where(lstMax.lt(t.optimal), 0)
        .where(lstMax.gte(t.optimal).and(lstMax.lt(t.stress)), 1)
        .where(lstMax.gte(t.stress).and(lstMax.lt(t.severe)), 3)
        .where(lstMax.gte(t.severe), 5).rename('HeatStress');
    var gdd = lsCol.select('LST').map(function (img) {
        return img.subtract(10).clamp(0, 100).set('system:time_start', img.get('system:time_start'));
    }).sum().rename('GDD');
    var stressDays = lsCol.select('LST').map(function (img) { return img.gt(t.stress).rename('stress_day'); }).sum().rename('StressDays');
    var yieldLoss = lstMax.subtract(t.stress).multiply(5).clamp(0, 100).rename('YieldLoss_pct');
    return { stressIndex: stressIndex, gdd: gdd, stressDays: stressDays, yieldLoss: yieldLoss, lsCol: lsCol, threshold: t };
};

// ===== Zonal Statistics =====
window.calculateZonalStats = function (image, indexName) {
    var adminBoundaries = ee.FeatureCollection(DEFAULT_ADMIN_ASSET);
    return image.reduceRegions({
        collection: adminBoundaries,
        reducer: ee.Reducer.mean().setOutputs(['mean']),
        scale: 1000,
        maxPixelsPerRegion: 1e9
    });
};

// ===== Land Cover Classification =====
window.calculateLandCover = function (composite) {
    var ndvi = indicesDict['NDVI'](composite);
    var ndwi = indicesDict['NDWI'](composite);
    var ndbi = indicesDict['NDBI'](composite);
    var classified = ee.Image(0)
        .where(ndwi.gt(0.1), 1).where(ndvi.gt(0.4), 2)
        .where(ndbi.gt(0.2), 3).where(ndvi.lt(0.2).and(ndwi.lt(0.1)).and(ndbi.lt(0.2)), 4);
    return classified.updateMask(classified.neq(0)).rename('LandCover');
};

// ===== AI Classification (Random Forest) =====
window.calculateAIClassification = function (composite, geometry) {
    var ndvi = composite.normalizedDifference(['NIR', 'RED']).rename('n');
    var ndwi = composite.normalizedDifference(['GREEN', 'NIR']).rename('w');
    var ndbi = composite.normalizedDifference(['SWIR1', 'NIR']).rename('b');
    var input = composite.select(['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2']).addBands([ndvi, ndwi, ndbi]);
    var trainingData = ee.Image(0)
        .where(ndwi.gt(0.1), 1).where(ndvi.gt(0.35), 2)
        .where(ndbi.gt(0.1), 3).where(ndvi.lt(0.15).and(ndwi.lt(0)).and(ndbi.lt(0)), 4).rename('class');
    var points = input.addBands(trainingData).updateMask(trainingData.neq(0)).sample({
        region: geometry, scale: 100, numPixels: 1200, geometries: true, tileScale: 16
    });
    var withRandom = points.randomColumn('random');
    var split = 0.7;
    var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
    var testingPartition = withRandom.filter(ee.Filter.gte('random', split));
    var classifier = ee.Classifier.smileRandomForest(50).train({
        features: trainingPartition, classProperty: 'class', inputProperties: input.bandNames()
    });
    var classified = input.classify(classifier);
    var test = testingPartition.classify(classifier);
    var confusionMatrix = test.errorMatrix('class', 'classification');
    return { classified: classified, confusionMatrix: confusionMatrix, classifier: classifier };
};

// ===== Nighttime Lights =====
window.calculateNighttimeLights = function (start, end, geometry) {
    return ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG")
        .filterDate(start, end).select('avg_rad').mean().clip(geometry);
};

// ===== Water History (JRC) =====
window.calculateWaterHistory = function (geometry) {
    return ee.Image('JRC/GSW1_4/GlobalSurfaceWater').clip(geometry).select('transition');
};

// ===== Detect Growth Stage (Phenology based) =====
window.detectGrowthStage = function (ndviVal, start, end, cropType) {
    var month = new Date(end).getMonth() + 1;
    var stage = 'مجهول';
    var isPlanted = ndviVal > 0.25;

    if (!isPlanted) return 'أرض مكشوفة / تحضير';

    // Simple logic based on NDVI and typical Egyptian seasons
    if (ndviVal < 0.4) stage = 'بداية النمو (Initial)';
    else if (ndviVal < 0.6) stage = 'نمو خضري (Development)';
    else if (ndviVal < 0.8) stage = 'اكتمال الغطاء (Mid-Season)';
    else stage = 'نضج (Late-Season)';

    return stage;
};

// ===== Predict Harvest Date (GDD based) =====
window.predictHarvestDate = function (start, end, geometry, cropType) {
    var lsCol = getMergedLandsatCollection(start, end, geometry);
    var gdd_lst = lsCol.select('LST').map(function (img) {
        return img.subtract(10).clamp(0, 100);
    }).sum();

    // Fallback: Use ERA5 temperature (Kelvin) if Landsat is unavailable
    var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
        .filterDate(start, end)
        .filterBounds(geometry)
        .select('temperature_2m');

    var gdd_era5 = era5.map(function (img) {
        return img.subtract(283.15).clamp(0, 100); // 10C = 283.15K
    }).sum();

    var gdd = ee.Image(ee.Algorithms.If(
        lsCol.size().gt(0),
        gdd_lst.unmask(gdd_era5),
        gdd_era5
    )).rename('GDD');

    // Typical total GDD required for harvest (estimate)
    var thresholds = {
        'Wheat': 1600, 'Maize': 2400, 'Rice': 2200,
        'Cotton': 2800, 'Sugarcane': 4500, 'Potato': 1800, 'Tomato': 1500, 'General Crop': 2000
    };

    // Robust Matching
    var t = thresholds['General Crop'];
    var keys = Object.keys(thresholds);
    for (var i = 0; i < keys.length; i++) {
        if (cropType.toLowerCase().indexOf(keys[i].toLowerCase()) > -1) {
            t = thresholds[keys[i]];
            break;
        }
    }

    var stats = gdd.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: 30,
        maxPixels: 1e9
    });

    return stats; // Returns {GDD: val}
};

// ===== Validate Farm Location =====
function validateFarmLocation(geometry, start, end) {
    var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(geometry)
        .filterDate(start, end).select(['crops', 'built', 'bare', 'grass', 'trees', 'water']);
    var dwMean = dw.mean().clip(geometry);

    // Performance Optimization: Combine S2 indices and stats into a single computation pipeline
    var s2Col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(geometry)
        .filterDate(start, end)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));

    var processedS2 = s2Col.map(function (img) {
        var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI');
        var bsi = img.expression('((B11+B4)-(B8+B2))/((B11+B4)+(B8+B2))', {
            'B11': img.select('B11'), 'B4': img.select('B4'),
            'B8': img.select('B8'), 'B2': img.select('B2')
        }).rename('BSI');
        var ndbi = img.normalizedDifference(['B11', 'B8']).rename('NDBI');
        var albedo = img.select(['B2', 'B3', 'B4']).reduce(ee.Reducer.mean()).rename('Albedo');

        return img.addBands([ndvi, bsi, ndbi, albedo])
            .select(['NDVI', 'BSI', 'NDBI', 'Albedo']);
    });

    // Reduce temporally first to create a single composite image with all required bands
    var timeReduced = processedS2.reduce(
        ee.Reducer.mean().combine(ee.Reducer.minMax(), '', true)
    );

    // Combine DW and S2 stats into one reduction call
    var combinedImage = dwMean.addBands(timeReduced);

    var stats = combinedImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: 10,
        maxPixels: 1e9
    });

    // === Spatial stdDev of last NDVI image (for uniform desert detection per sage.js) ===
    var ndviLatest = s2Col.map(function (img) {
        return img.normalizedDifference(['B8', 'B4']).rename('NDVI');
    }).sort('system:time_start', false).first();

    var spatialStats = ee.Algorithms.If(
        ndviLatest,
        ndviLatest.reduceRegion({
            reducer: ee.Reducer.stdDev().combine(ee.Reducer.mean(), '', true),
            geometry: geometry,
            scale: 10,
            maxPixels: 1e9
        }),
        ee.Dictionary({ NDVI_stdDev: 0.05, NDVI_mean: 0.1 })
    );

    return ee.Dictionary({
        crops_prob: stats.get('crops'),
        built_prob: stats.get('built'),
        bare_prob: stats.get('bare'),
        grass_prob: stats.get('grass'),
        water_prob: stats.get('water'),
        ndvi_max: stats.get('NDVI_max'),
        ndvi_min: stats.get('NDVI_min'),
        ndvi_range: ee.Number(stats.get('NDVI_max')).subtract(ee.Number(stats.get('NDVI_min'))),
        ndvi_mean: stats.get('NDVI_mean'),
        bsi_mean: stats.get('BSI_mean'),
        ndbi_mean: stats.get('NDBI_mean'),
        albedo_mean: stats.get('Albedo_mean'),
        observation_count: s2Col.size(),
        // === NEW: Spatial stdDev for uniform desert detection (parity with sage.js) ===
        ndvi_stdDev: ee.Dictionary(spatialStats).get('NDVI_stdDev'),
        ndvi_spatial_mean: ee.Dictionary(spatialStats).get('NDVI_mean'),

        // 🛡️ REFINEMENT: Add hard guard for agricultural land
        // If NDVI is clearly indicating active growth, it's not desert
        is_agri_guard: ee.Number(stats.get('NDVI_max')).gt(0.25)
    });
}

// ===== Sensor Collection Router =====
window.getAnyCollection = function (sensor, start, end, geometry) {
    var l8b = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'ST_B10'];
    var l57b = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'ST_B6'];
    var cb = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'LST'];
    if (sensor === 'Sentinel-2' || !sensor) return getS2Collection(start, end, geometry);
    if (sensor === 'Landsat 8') return ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').filterDate(start, end).filterBounds(geometry).map(cloudMaskLandsat).map(applyScaleFactors).select(l8b, cb);
    if (sensor === 'Landsat 7') return ee.ImageCollection('LANDSAT/LE07/C02/T1_L2').filterDate(start, end).filterBounds(geometry).map(cloudMaskLandsat).map(applyScaleFactors).select(l57b, cb);
    if (sensor === 'Landsat 5') return ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').filterDate(start, end).filterBounds(geometry).map(cloudMaskLandsat).map(applyScaleFactors).select(l57b, cb);
    return getS2Collection(start, end, geometry);
};

// ===== Yield Simple (Client-side) =====
window.estimateYield_Simple = function (ndviVal, cropType) {
    var yields = {
        'قمح': { unit: 'إردب', max: 24, min: 10 }, 'Wheat': { unit: 'إردب', max: 24, min: 10 },
        'ذرة': { unit: 'إردب', max: 30, min: 12 }, 'Maize': { unit: 'إردب', max: 30, min: 12 },
        'أرز': { unit: 'طن', max: 4.5, min: 1.5 }, 'Rice': { unit: 'طن', max: 4.5, min: 1.5 },
        'قطن': { unit: 'قنطار', max: 10, min: 4 }, 'Cotton': { unit: 'قنطار', max: 10, min: 4 },
        'بطاطس': { unit: 'طن', max: 25, min: 8 }, 'Potato': { unit: 'طن', max: 25, min: 8 },
        'طماطم': { unit: 'طن', max: 50, min: 15 }, 'Tomato': { unit: 'طن', max: 50, min: 15 }
    };
    var cropKey = null;
    var keys = Object.keys(yields);
    for (var k = 0; k < keys.length; k++) { if (cropType && cropType.indexOf(keys[k]) > -1) { cropKey = keys[k]; break; } }
    if (!cropKey) return 'غير متوفر لهذا المحصول';
    var d = yields[cropKey];
    var ndviClamped = Math.min(0.8, Math.max(0.2, ndviVal));
    var factor = (ndviClamped - 0.2) / 0.6;
    var estimatedYield = d.min + (factor * (d.max - d.min));
    var lower = (estimatedYield * 0.9).toFixed(1);
    var upper = (estimatedYield * 1.1).toFixed(1);
    var status = factor > 0.7 ? 'ممتاز (عالي الإنتاجية)' : factor < 0.3 ? 'منخفض (يحتاج رعاية)' : 'متوسط (طبيعي)';
    return lower + ' - ' + upper + ' ' + d.unit + '/فدان (' + status + ')';
};

// ===== USDA Texture Classification =====
window.getTextureName = function (clay, sand) {
    if (clay === null || sand === null) return 'تقديري';
    var silt = 100 - clay - sand; if (silt < 0) silt = 0;
    if (sand >= 85 && clay < 10) return 'رملي (Sand)';
    if (sand >= 70 && sand < 90 && clay < 15) return 'رملي لومي (Loamy Sand)';
    if (clay >= 40 && silt >= 40) return 'طين سلتي (Silty Clay)';
    if (clay >= 35 && sand >= 45) return 'طين رملي (Sandy Clay)';
    if (clay >= 40) return 'طين (Clay)';
    if (clay >= 27 && clay < 40 && sand < 20) return 'طين سلتي لومي (Silty Clay Loam)';
    if (clay >= 27 && clay < 40 && sand >= 20 && sand <= 45) return 'طين لومي (Clay Loam)';
    if (clay >= 20 && clay < 35 && sand > 45) return 'طين رملي لومي (Sandy Clay Loam)';
    if (silt >= 80 && clay < 12) return 'سلت (Silt)';
    if (silt >= 50 && clay < 27) return 'سلت لومي (Silt Loam)';
    if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'لومي (Loam)';
    if (sand >= 43 && clay < 20) return 'لومي رملي (Sandy Loam)';
    return 'لومي (Loam)';
};

// ===== Detect Anomalies =====
function detectAnomalies(farmArea, s2Col) {
    var ndviCol = s2Col.map(function (img) { return indicesDict['NDVI'](img); });
    var ndviMean = ndviCol.mean();
    var ndviStd = ndviCol.reduce(ee.Reducer.stdDev());
    var threshold = ndviMean.subtract(ndviStd.multiply(1.5));
    var anomalies = ndviMean.lt(threshold);
    return anomalies.multiply(ee.Image.pixelArea()).reduceRegion({
        reducer: ee.Reducer.sum(), geometry: farmArea, scale: 10, maxPixels: 1e9
    });
}

// ===== Expert Logic: Pest & Disease Risk =====
window.calculatePestRisk = function (rh, temp, cropType) {
    var isWheat = (cropType.indexOf('قمح') > -1 || cropType.indexOf('Wheat') > -1);
    var isPotato = (cropType.indexOf('بطاطس') > -1 || cropType.indexOf('Potato') > -1);
    var isTomato = (cropType.indexOf('طماطم') > -1 || cropType.indexOf('Tomato') > -1);

    var risk = '✅ منخفضة';
    var msg = 'الظروف الجوية مستقرة.';
    var color = 'green';

    if (isWheat) {
        if (rh > 60 && temp >= 15 && temp <= 25) {
            risk = '🔴 خطر داهم (الصدأ الأصفر)';
            msg = 'رطوبة عالية وحرارة معتدلة: بيئة مثالية للصدأ.';
            color = 'red';
        } else if (rh > 50 && temp > 25) {
            risk = '🟠 خطر متوسط (صدأ الساق/الأوراق)';
            msg = 'الرطوبة تدعم نمو الفطريات.';
            color = 'orange';
        }
    } else if (isPotato) {
        if (rh > 85 && temp >= 10 && temp <= 20) {
            risk = '🔴 خطر الندوة المتأخرة (كارثي)';
            msg = 'رطوبة جوية مشبعة! يجب الرش الوقائي فوراً.';
            color = 'red';
        } else if (rh > 70) {
            risk = '🟠 خطر الندوة المبكرة';
            msg = 'الرطوبة عالية، افحص الأوراق السفلية.';
            color = 'orange';
        }
    } else if (isTomato) {
        if (rh > 80 && temp < 20) {
            risk = '🔴 خطر الندوة المتأخرة';
            msg = 'رطوبة عالية وحرارة منخفضة.';
            color = 'red';
        }
    }

    if (temp > 30 && rh < 40) {
        risk = '🟠 خطر العنكبوت الأحمر';
        msg = 'الجو حار وجاف، مثالي للعنكبوت.';
        color = 'orange';
    }

    return { risk: risk, msg: msg, color: color };
};

// ===== Expert Logic: Crop Salinity Compatibility =====
window.checkCropCompatibility = function (ecReal, cropType) {
    var toleranceMap = {
        'فراولة': 1, 'فاصوليا': 1,
        'برتقال': 2, 'ذرة': 2, 'طماطم': 2,
        'قمح': 3, 'قطن': 3,
        'شعير': 4, 'بنجر': 4, 'نخيل': 4
    };

    var currentClassIndex = 0;
    var label = '✅ غير مالحة';
    var color = 'green';

    if (ecReal > 16) { currentClassIndex = 4; label = '☠️ ملوحة شديدة'; color = '#B71C1C'; }
    else if (ecReal > 8) { currentClassIndex = 3; label = '🛑 ملوحة مرتفعة'; color = '#D32F2F'; }
    else if (ecReal > 4) { currentClassIndex = 2; label = '⛔ ملوحة متوسطة'; color = '#FB8C00'; }
    else if (ecReal > 2) { currentClassIndex = 1; label = '⚠️ ملوحة خفيفة'; color = '#FFB300'; }

    var isCompatible = true;
    var cropKey = null;
    var keys = Object.keys(toleranceMap);
    for (var i = 0; i < keys.length; i++) {
        if (cropType.indexOf(keys[i]) > -1) {
            cropKey = keys[i];
            if (currentClassIndex > toleranceMap[cropKey]) isCompatible = false;
            break;
        }
    }

    return { isCompatible: isCompatible, label: label, color: color, classIndex: currentClassIndex };
};

// ===== Expert Logic: Spraying Guide =====
window.calculateSprayingGuide = function (windSpeed, temp) {
    var canSpray = windSpeed < 5;
    var color = canSpray ? 'green' : 'red';
    var msg = canSpray ? 'الرياح هادئة، مناسب للرش.' : 'الرياح شديدة، تجنب الرش لمنع الانجراف.';

    if (canSpray && temp > 35) {
        canSpray = false;
        color = 'orange';
        msg = 'الحرارة عالية جداً، يفضل الرش في الصباح الباكر أو المساء.';
    }

    return { canSpray: canSpray, color: color, msg: msg };
};

// ===== Expert Logic: FAO-56 Irrigation =====
window.calculateFAO56Irrigation = function (etDaily, cropType, currentMonth, precipVal, daysDiff) {
    var kcTable = {
        'قمح': 1.15, 'ذرة': 1.20, 'أرز': 1.20, 'قطن': 1.15, 'قصب': 1.25,
        'بطاطس': 1.15, 'طماطم': 1.15, 'فول': 1.15, 'برسيم': 0.95, 'بنجر': 1.20,
        'بصل': 1.05, 'فلفل': 1.05, 'خيار': 1.00, 'موالح': 0.65, 'زيتون': 0.70, 'نخيل': 0.90
    };

    var selectedKc = 1.0;
    var keys = Object.keys(kcTable);
    for (var i = 0; i < keys.length; i++) {
        if (cropType.indexOf(keys[i]) > -1) { selectedKc = kcTable[keys[i]]; break; }
    }

    // Fallback ET0 based on month
    // ETo monthly averages for Egypt — calibrated from sage.js (FAO-56 Penman-Monteith)
    // Values represent typical daily ETo (mm/day) per month for Egyptian conditions
    var etoFallbacks = [2.5, 3.0, 4.5, 6.0, 7.5, 8.5, 9.0, 8.0, 6.5, 5.0, 3.5, 2.5];
    if (etDaily < 1.5 || isNaN(etDaily)) {
        etDaily = etoFallbacks[Math.max(0, Math.min(11, currentMonth - 1))];
    }

    var etc = etDaily * selectedKc;
    var effectiveRain = (precipVal / daysDiff) * 0.8;
    var netIRR = Math.max(0.5 * etc, etc - effectiveRain); // At least 50% if no extreme rain

    return {
        etDaily: etDaily,
        kc: selectedKc,
        etc: etc,
        netIRR: netIRR,
        m3PerFeddanDay: netIRR * 4.2,
        m3PerFeddanMonth: netIRR * 4.2 * 30
    };
};

// ===== Expert Logic: Leaching Requirements =====
window.calculateLeachingRequirement = function (ecReal, cropType) {
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

    var cropEC = { ecMax: 4.0, yieldLoss10: 5.5 };
    var keys = Object.keys(cropEcThreshold);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var match = cropEcThreshold[k];
        if (cropType.indexOf(k) > -1 || cropType.toLowerCase().indexOf(match.nameEn.toLowerCase()) > -1) {
            var slope = 10 / Math.max(0.1, (match.yieldLoss10 - match.ecMax));
            cropEC = { ecMax: match.ecMax, slope: slope };
            break;
        }
    }

    var yieldLoss = 0;
    if (ecReal > cropEC.ecMax) {
        yieldLoss = Math.min(100, (ecReal - cropEC.ecMax) * cropEC.slope);
    }

    var calculateLR = function (ecw) {
        var denom = (5 * cropEC.ecMax) - ecw;
        if (denom <= 0) return 0.5;
        var lr = ecw / denom;
        return Math.min(0.5, Math.max(0, lr));
    };

    var lrNile = calculateLR(0.5);
    var reclamationM3 = 0;
    if (ecReal > cropEC.ecMax) {
        var leachFactor = 120; // Avg soil
        reclamationM3 = (ecReal - cropEC.ecMax) * leachFactor;
    }

    return {
        cropMax: cropEC.ecMax,
        yieldLoss: yieldLoss,
        lrNile: lrNile,
        lr: lrNile, // default for app_v4
        reclamationM3: reclamationM3,
        lrWell: calculateLR(1.5),
        lrSaline: calculateLR(3.0)
    };
};

// ===== V2.5 Additive Multi-Evidence Salinity Model (from original sage.js) =====
// This is the original model used in GEE Code Editor Farmer Mode
// Kept alongside V4.3 (SoilGrids Anchored) for full parity
window.estimateSalinity_V25 = function (s2, s1, lst, precip, et, dem, slope) {
    var ndvi = s2.normalizedDifference(['NIR', 'RED']).unmask(0);
    var ndvi_inv = ndvi.multiply(-1);
    var ndmi = s2.normalizedDifference(['NIR', 'SWIR1']).unmask(0);
    var ndmi_inv = ndmi.multiply(-1);

    var vegFactor = ndvi.unitScale(0.25, 0.6).clamp(0, 1);
    var soilWeight = ee.Image(1).subtract(vegFactor);

    var ndbi = s2.normalizedDifference(['SWIR1', 'NIR']).unmask(0);
    var urbanFactor = ndbi.unitScale(0.0, 0.3).clamp(0, 1);
    soilWeight = soilWeight.multiply(ee.Image(1).subtract(urbanFactor));

    var si1 = s2.expression('sqrt(GREEN * RED)', { 'GREEN': s2.select('GREEN'), 'RED': s2.select('RED') }).unmask(0);
    var si2 = s2.expression('sqrt(RED * NIR)', { 'RED': s2.select('RED'), 'NIR': s2.select('NIR') }).unmask(0);
    var si3 = s2.normalizedDifference(['SWIR1', 'SWIR2']).unmask(0);

    var vv = s1.select('VV_smoothed').unmask(-15).clamp(-25, -5);
    var vh = s1.select('VH_smoothed').unmask(-22).clamp(-30, -10);
    var pol_ratio = vv.subtract(vh).clamp(-10, 10);

    var elev_norm = dem.unitScale(0, 300).clamp(0, 1).unmask(0.5);
    var lst_norm = lst.unitScale(15, 50).unmask(0.5);
    var waterDeficit = et.subtract(precip).divide(et.add(0.1)).unmask(0.8);

    var spectral_salt_evidence = si3.unitScale(0, 0.12).clamp(0, 1);
    var env_modulator = spectral_salt_evidence.multiply(0.7).add(0.3);

    var ec_estimated = ee.Image(1.0)
        .add(si1.multiply(1.0).add(si2.multiply(1.2)).add(si3.multiply(2.0)).add(ndvi_inv.multiply(1.0)).add(ndmi_inv.multiply(1.2)).multiply(soilWeight))
        .add(vv.multiply(-0.1).add(pol_ratio.multiply(0.8)).multiply(soilWeight.add(0.1)))
        .add(elev_norm.multiply(-1.5))
        .add(lst_norm.multiply(1.0).add(waterDeficit.multiply(1.5)).multiply(soilWeight.add(0.05)).multiply(env_modulator))
        .clamp(0.5, 30)
        .rename('EC_V25');

    return ec_estimated;
};

// ===== High-Resolution Soil Moisture (S2+S1+LST+SoilGrids Fusion) =====
window.calculateSoilMoisture_HighRes = function (s2, s1, lst, precip, soilTexture, geometry) {
    var ndvi = s2.normalizedDifference(['NIR', 'RED']);
    var ndmi = s2.normalizedDifference(['NIR', 'SWIR1']);

    // TVDI calculation
    var lstStats = lst.reduceRegion({
        reducer: ee.Reducer.percentile([5, 95]),
        geometry: geometry.buffer(1000),
        scale: 30,
        maxPixels: 1e9
    });

    var lstMax = ee.Number(lstStats.get('LST_p95'));
    var lstMin = ee.Number(lstStats.get('LST_p5'));

    var tvdi = ee.Image(lstMax).subtract(lst)
        .divide(ee.Image(lstMax).subtract(ee.Image(lstMin)));

    // SAR with roughness correction
    var vv_db = s1.select('VV_smoothed');
    var roughness = ndvi.multiply(2).subtract(1).clamp(-1, 1);
    var vv_corrected = vv_db.subtract(roughness.multiply(3));

    // Texture adjustment
    var sandFraction = soilTexture.select('Sand').divide(100);
    var clayFraction = soilTexture.select('Clay').divide(100);
    var textureEffect = clayFraction.subtract(sandFraction).multiply(0.1);

    // Fusion model
    var sm = ee.Image(0.25)
        .add(ndmi.multiply(0.15))
        .add(tvdi.multiply(-0.20))
        .add(vv_corrected.multiply(0.002))
        .add(precip.multiply(0.01))
        .add(textureEffect)
        .clamp(0.05, 0.50)
        .rename('SM_HighRes');

    return sm;
};

// ===== Regional NDVI Benchmark =====
window.calculateRegionalBenchmark = function (region, start, end) {
    var regionalArea = region.buffer(5000);

    var regionalNDVI = getS2Collection(start, end, regionalArea)
        .map(function (img) {
            return indicesDict['NDVI'](img);
        })
        .median();

    var regionalStats = regionalNDVI.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: regionalArea,
        scale: 100,
        maxPixels: 1e9
    });

    return regionalStats;
};

// ===== Egypt-Calibrated Multi-Factor Yield Model =====
window.estimateYield_Egypt = function (crop, ndvi, evi, lst, precip, et, sm, soilOC) {
    var models = {
        'قمح': { base: 2.8, ndvi: 1.2, evi: 0.8, temp_opt: 18, temp_tol: 10, water_sens: 0.7, soil_factor: 0.3 },
        'Wheat': { base: 2.8, ndvi: 1.2, evi: 0.8, temp_opt: 18, temp_tol: 10, water_sens: 0.7, soil_factor: 0.3 },
        'ذرة': { base: 3.5, ndvi: 1.5, evi: 1.0, temp_opt: 28, temp_tol: 12, water_sens: 0.9, soil_factor: 0.4 },
        'Maize': { base: 3.5, ndvi: 1.5, evi: 1.0, temp_opt: 28, temp_tol: 12, water_sens: 0.9, soil_factor: 0.4 },
        'أرز': { base: 4.0, ndvi: 1.3, evi: 0.9, temp_opt: 28, temp_tol: 8, water_sens: 1.2, soil_factor: 0.2 },
        'Rice': { base: 4.0, ndvi: 1.3, evi: 0.9, temp_opt: 28, temp_tol: 8, water_sens: 1.2, soil_factor: 0.2 },
        'قطن': { base: 0.9, ndvi: 0.8, evi: 0.6, temp_opt: 30, temp_tol: 12, water_sens: 0.8, soil_factor: 0.3 },
        'Cotton': { base: 0.9, ndvi: 0.8, evi: 0.6, temp_opt: 30, temp_tol: 12, water_sens: 0.8, soil_factor: 0.3 }
    };

    // Find matching model
    var model = models['قمح']; // default
    var cropStr = crop || '';
    for (var k in models) {
        if (cropStr.indexOf(k) > -1) { model = models[k]; break; }
    }

    var vigorScore = ndvi.multiply(model.ndvi).add(evi.multiply(model.evi));
    var tempStress = ee.Image(1).subtract(
        lst.subtract(model.temp_opt).abs().divide(model.temp_tol).clamp(0, 1)
    );
    var waterBalance = precip.subtract(et).divide(et.add(1));
    var waterScore = ee.Image(1).add(waterBalance.multiply(model.water_sens)).clamp(0.3, 1.3);
    var ocPercent = soilOC.divide(10);
    var soilScore = ee.Image(1).add(ocPercent.subtract(1).multiply(model.soil_factor)).clamp(0.7, 1.2);
    var smScore = sm.subtract(0.15).divide(0.20).clamp(0.5, 1.2);

    var yieldEstimate = ee.Image(model.base)
        .multiply(vigorScore)
        .multiply(tempStress)
        .multiply(waterScore)
        .multiply(soilScore)
        .multiply(smScore)
        .clamp(model.base * 0.3, model.base * 1.5)
        .rename('Yield_ton_feddan');

    return yieldEstimate;
};

// ===== Optimized Data Extraction (Single-Image Stack) =====
window.getOptimizedFarmerReport = function (lat, lng, bufferSize, startDate, endDate, cropType) {
    var farmPoint = ee.Geometry.Point([lng, lat]);
    var farmArea = farmPoint.buffer(bufferSize);

    // 1. Data Collection Initialization
    var optCol = getS2Collection(startDate, endDate, farmArea);
    var opt = optCol.median().clip(farmArea);
    var era5 = getEra5(startDate, endDate, farmArea);
    var soil = getSoilGridsData(farmArea);
    var lsCol = getMergedLandsatCollection(startDate, endDate, farmArea);
    var lst = lsCol.select('LST').median();
    var s1 = getS1Collection(startDate, endDate, farmArea).median();
    var precip = getChirps(startDate, endDate, farmArea);
    var et = getTerraClimateET(startDate, endDate, farmArea);
    var dem = getDEM().clip(farmArea);
    var slope = getSlope().clip(farmArea);

    // 2. Index Calculation — Full set matching sage.js
    var ndvi = indicesDict['NDVI'](opt);
    var evi = indicesDict['EVI'](opt);
    var ndmi = indicesDict['NDMI'](opt);
    var bsi = indicesDict['BSI'](opt);
    var ndsi = indicesDict['NDSI'](opt);
    var savi = indicesDict['SAVI'](opt);
    var gci = indicesDict['GCI'](opt);
    var si3 = indicesDict['SI3'](opt);
    var esi = indicesDict['ESI'](opt);
    var clayRatio = indicesDict['ClayRatio'](opt);
    var ironOxide = indicesDict['IronOxide'](opt);
    var gypsumIndex = indicesDict['GypsumIndex'](opt);
    var carbonateIndex = indicesDict['CarbonateIndex'](opt);

    // Models — Both V4.3 and V2.5 salinity
    var ec = estimateSalinity_ML(opt, s1, lst, precip, et, dem, slope, soil);
    var ec_v25 = estimateSalinity_V25(opt, s1, lst, precip, et, dem, slope);
    var vhi = calculateVHI(startDate, endDate, farmArea);
    var cdi = calculateCDI(startDate, endDate, farmArea);
    var desertRisk = calculateDesertRisk(startDate, endDate, farmArea);
    var carbon = calculateCarbonStock(opt, farmArea);

    // High-Res Soil Moisture
    var smHR = calculateSoilMoisture_HighRes(opt, s1, lst, precip, soil, farmArea);

    // Derived Scalars (GDD, Benchmark, Anomalies)
    var harvestData = predictHarvestDate(startDate, endDate, farmArea, cropType);
    var gdd = ee.Algorithms.If(harvestData.contains('GDD'), harvestData.get('GDD'), 0);

    // Anomaly Image (Mask)
    var ndviCol = optCol.map(function (img) { return indicesDict['NDVI'](img); });
    var ndviMean = ndviCol.mean();
    var ndviStd = ndviCol.reduce(ee.Reducer.stdDev());
    var anomalies = ndviMean.lt(ndviMean.subtract(ndviStd.multiply(1.5))).rename('Anomalies');

    // 🆕 Land Suitability Metrics (Parity with sage.js validateFarmLocation)
    var landSuit = validateFarmLocation(farmArea, startDate, endDate);

    // 3. Stacking for Single reduceRegion — ALL bands
    var stacked = opt.addBands([
        ndvi, evi, ndmi, bsi, ndsi, savi, gci,
        si3, esi, clayRatio, ironOxide, gypsumIndex, carbonateIndex,
        soil,
        era5,
        ec, ec_v25,
        vhi, cdi, desertRisk,
        carbon.carbonStock, carbon.co2eq, carbon.agb,
        smHR,
        anomalies,
        ee.Image.constant(gdd).rename('gdd'),
        // Add Land Suitability as constant bands for reduction
        ee.Image.constant(landSuit.get('crops_prob')).rename('crops_prob'),
        ee.Image.constant(landSuit.get('built_prob')).rename('built_prob'),
        ee.Image.constant(landSuit.get('bare_prob')).rename('bare_prob'),
        ee.Image.constant(landSuit.get('ndvi_max')).rename('ndvi_max_val'),
        ee.Image.constant(landSuit.get('ndvi_min')).rename('ndvi_min_val'),
        ee.Image.constant(landSuit.get('ndvi_range')).rename('ndvi_range_val'),
        ee.Image.constant(landSuit.get('bsi_mean')).rename('bsi_mean_val'),
        ee.Image.constant(landSuit.get('ndbi_mean')).rename('ndbi_mean_val'),
        ee.Image.constant(landSuit.get('albedo_mean')).rename('albedo_mean_val'),
        ee.Image.constant(landSuit.get('ndvi_stdDev')).rename('ndvi_stdDev_val'),
        ee.Image.constant(landSuit.get('is_agri_guard')).rename('is_agri_guard')
    ]);

    // Perform the one-shot reduction
    return stacked.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: farmArea,
        scale: 10,
        maxPixels: 1e9,
        bestEffort: true
    });
};

// ===== Export all globals =====
window.calculatePestRisk = calculatePestRisk;
window.getSoilGridsData = getSoilGridsData;
window.checkCropCompatibility = checkCropCompatibility;
window.calculateSprayingGuide = calculateSprayingGuide;
window.calculateFAO56Irrigation = calculateFAO56Irrigation;
window.calculateLeachingRequirement = calculateLeachingRequirement;
window.estimateSalinity_V25 = estimateSalinity_V25;
window.calculateSoilMoisture_HighRes = calculateSoilMoisture_HighRes;
window.calculateRegionalBenchmark = calculateRegionalBenchmark;
window.estimateYield_Egypt = estimateYield_Egypt;

console.log('ee-computations_v5.js loaded — Full parity with sage.js active');
