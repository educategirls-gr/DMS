// ── Tabs that benefit from caching (seconds) ──────────────────
const CACHE_TTL = {
  Users:     300,   // 5 min  — rarely changes
  Dropdowns: 600,   // 10 min — rarely changes
  Documents:  90,   // 90 sec — changes on upload/verify/approve
  Circulars: 120,   // 2 min
  CircularAck: 60   // 1 min
};

function _cacheKey(tabName) { return 'sht_' + tabName; }

function _readFromCache(tabName) {
  try {
    const ttl = CACHE_TTL[tabName];
    if (!ttl) return null;
    const raw = CacheService.getScriptCache().get(_cacheKey(tabName));
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function _writeToCache(tabName, data) {
  try {
    const ttl = CACHE_TTL[tabName];
    if (!ttl) return;
    const json = JSON.stringify(data);
    if (json.length > 90000) return; // skip if > 90KB (CacheService limit ~100KB)
    CacheService.getScriptCache().put(_cacheKey(tabName), json, ttl);
  } catch(e) { /* silent — cache miss is fine */ }
}

function invalidateCache(tabName) {
  try { CacheService.getScriptCache().remove(_cacheKey(tabName)); } catch(e) {}
}

// ──────────────────────────────────────────────────────────────

// Script-level cache — SpreadsheetApp.openById() is expensive, call once per execution
var _SS = null;
function _getSpreadsheet() {
  if (!_SS) _SS = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  return _SS;
}

function getSheet(tabName) {
  return _getSpreadsheet().getSheetByName(tabName);
}

function getSheetData(tabName) {
  const cached = _readFromCache(tabName);
  if (cached) return cached;

  const sheet = getSheet(tabName);
  if (!sheet) return [];                      // tab doesn't exist yet → empty
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  _writeToCache(tabName, rows);
  return rows;
}

function appendRow(tabName, rowData) {
  let sheet = getSheet(tabName);
  // If tab doesn't exist, create it with headers from rowData keys
  if (!sheet) {
    sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).insertSheet(tabName);
    const keys = Object.keys(rowData);
    sheet.getRange(1, 1, 1, keys.length).setValues([keys]);
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => rowData[h] !== undefined ? rowData[h] : '');
  sheet.appendRow(row);
  invalidateCache(tabName);        // ← bust cache on write
}

function findRowIndex(tabName, columnName, value) {
  // Use cached sheet data — avoid extra Sheets API call
  const rows = getSheetData(tabName);
  const idx  = rows.findIndex(r => r[columnName] === value);
  return idx === -1 ? -1 : idx + 2; // +2 = header row (1) + 0-based to 1-based
}

function updateCell(tabName, rowNumber, columnName, value) {
  const sheet = getSheet(tabName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.indexOf(columnName);
  if (colIndex === -1) return;
  sheet.getRange(rowNumber, colIndex + 1).setValue(value);
  invalidateCache(tabName);        // ← bust cache on write
}

function getUserByEmail(email) {
  const users = getSheetData(CONFIG.TABS.USERS);
  return users.find(u => u.email === email && u.is_active === true) || null;
}

function writeAuditLog(userEmail, userName, action, docId, fileName) {
  appendRow(CONFIG.TABS.AUDIT_LOG, {
    timestamp:  formatDate(new Date()),
    user_email: userEmail,
    user_name:  userName,
    action:     action,
    doc_id:     docId || '',
    file_name:  fileName || '',
    ip_note:    ''
  });
}
