// Temporary debug functions — delete after testing is done

function debugSendOTP() {
  const testEmail = 'alok.mohan@educategirls.ngo';

  Logger.log('--- Step 1: Domain check ---');
  Logger.log('isValidDomain: ' + isValidDomain(testEmail));

  Logger.log('--- Step 2: User lookup ---');
  const user = getUserByEmail(testEmail);
  Logger.log('User found: ' + JSON.stringify(user));

  if (!user) {
    Logger.log('❌ User not found in Users sheet. Check is_active column value.');
    return;
  }

  Logger.log('--- Step 3: OTP generate ---');
  const otp = generateOTP();
  Logger.log('Generated OTP: ' + otp);

  Logger.log('--- Step 4: MailApp test ---');
  try {
    GmailApp.sendEmail(testEmail, 'DMS Debug Test OTP', 'Test OTP: ' + otp);
    Logger.log('✅ Email sent successfully!');
  } catch (e) {
    Logger.log('❌ Email failed: ' + e.toString());
  }
}

function debugDriveAccess() {
  try {
    Logger.log('--- Drive Folder Access Test ---');
    const folder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
    Logger.log('✅ Root folder found: ' + folder.getName());

    const subFolder = getOrCreateFolder(CONFIG.ROOT_FOLDER_ID, 'Test_Folder');
    Logger.log('✅ Sub-folder created/found: ' + subFolder.getName());

    // Clean up test folder
    subFolder.setTrashed(true);
    Logger.log('✅ Drive access working perfectly!');
  } catch (e) {
    Logger.log('❌ Drive error: ' + e.toString());
  }
}

function debugCheckUsersSheet() {
  const sheet   = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.TABS.USERS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log('=== Column headers ===');
  Logger.log(JSON.stringify(headers));

  const users = getSheetData(CONFIG.TABS.USERS);
  Logger.log('Total users: ' + users.length);
  users.forEach(u => {
    Logger.log(
      'Email: ' + u.email +
      ' | Role: ' + u.role +
      ' | state: [' + u.state + ']' +
      ' | state_group: [' + u.state_group + ']' +
      ' | is_active: ' + u.is_active
    );
  });
}

// ── Run once: add state + state_group columns to Users sheet ──
function migrateUsersSheet() {
  const ss      = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet   = ss.getSheetByName(CONFIG.TABS.USERS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const toAdd   = ['state', 'state_group'].filter(h => !headers.includes(h));
  if (toAdd.length === 0) { Logger.log('Users columns already exist.'); return; }
  toAdd.forEach(col => {
    const nextCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, nextCol).setValue(col)
      .setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold');
    Logger.log('Added column: ' + col + ' at position ' + nextCol);
  });
  Logger.log('✅ Users sheet migration done.');
}

// ── Run once: add state column to Documents sheet ──
function migrateDocumentsSheet() {
  const ss      = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet   = ss.getSheetByName(CONFIG.TABS.DOCUMENTS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const toAdd   = ['target_component', 'state'].filter(h => !headers.includes(h));
  if (toAdd.length === 0) { Logger.log('Documents columns already exist.'); return; }
  toAdd.forEach(col => {
    const nextCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, nextCol).setValue(col)
      .setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold');
    Logger.log('Added column: ' + col + ' at position ' + nextCol);
  });
  Logger.log('✅ Documents sheet migration done.');
}

// ── Run once to add target_component column header to Documents sheet ──
function addTargetComponentColumn() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.DOCUMENTS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.includes('target_component')) {
    Logger.log('Column already exists.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue('target_component');
  sheet.getRange(1, nextCol)
    .setBackground('#1a237e')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  Logger.log('✅ target_component column added at column ' + nextCol);
}

// ════════════════════════════════════════════════════════════
//  ONE-TIME CLEANUP — Delete all test data before live launch
//  Run from: Script Editor → Select function → ▶ Run
//  ⚠️  IRREVERSIBLE — Drive files bhi trash mein jayenge
// ════════════════════════════════════════════════════════════
function clearAllTestData() {
  const results = {
    docsDeleted:    0,
    filesRemoved:   0,
    auditCleared:   0,
    imagesDeleted:  0,
    circularsCleared: 0,
    ackCleared:     0,
    errors:         []
  };

  try {
    // 1. Documents sheet — Drive files trash + rows delete
    const docSheet = getSheet(CONFIG.TABS.DOCUMENTS);
    const docs     = getSheetData(CONFIG.TABS.DOCUMENTS);
    docs.forEach(function(d) {
      try {
        if (d.drive_link) {
          const match = d.drive_link.match(/\/d\/([a-zA-Z0-9_-]+)/) || d.drive_link.match(/id=([a-zA-Z0-9_-]+)/);
          if (match) {
            DriveApp.getFileById(match[1]).setTrashed(true);
            results.filesRemoved++;
          }
        }
      } catch(e) { results.errors.push('Drive file: ' + e.message); }
    });
    if (docs.length > 0) {
      docSheet.deleteRows(2, docs.length);
      results.docsDeleted = docs.length;
    }
    Logger.log('✅ Documents cleared: ' + results.docsDeleted + ' rows, ' + results.filesRemoved + ' files trashed');

    // 2. AuditLog — clear all rows
    const auditSheet = getSheet(CONFIG.TABS.AUDIT_LOG);
    const auditRows  = auditSheet.getLastRow() - 1;
    if (auditRows > 0) {
      auditSheet.deleteRows(2, auditRows);
      results.auditCleared = auditRows;
    }
    Logger.log('✅ AuditLog cleared: ' + results.auditCleared + ' rows');

    // 3. Circulars — Drive files + rows
    const circSheet = getSheet(CONFIG.TABS.CIRCULARS);
    const circs     = getSheetData(CONFIG.TABS.CIRCULARS);
    circs.forEach(function(c) {
      try {
        if (c.drive_link) {
          const match = c.drive_link.match(/\/d\/([a-zA-Z0-9_-]+)/) || c.drive_link.match(/id=([a-zA-Z0-9_-]+)/);
          if (match) { DriveApp.getFileById(match[1]).setTrashed(true); }
        }
      } catch(e) { results.errors.push('Circular file: ' + e.message); }
    });
    if (circs.length > 0) {
      circSheet.deleteRows(2, circs.length);
      results.circularsCleared = circs.length;
    }
    Logger.log('✅ Circulars cleared: ' + results.circularsCleared + ' rows');

    // 4. CircularAck — clear all rows
    const ackSheet = getSheet(CONFIG.TABS.CIRCULAR_ACK);
    const ackRows  = ackSheet.getLastRow() - 1;
    if (ackRows > 0) {
      ackSheet.deleteRows(2, ackRows);
      results.ackCleared = ackRows;
    }

    // 5. ImageEvents — rows only (images in Drive folder left as-is unless you want them too)
    const imgSheet = getSheet(CONFIG.TABS.IMAGE_EVENTS);
    const imgRows  = imgSheet.getLastRow() - 1;
    if (imgRows > 0) {
      imgSheet.deleteRows(2, imgRows);
      results.imagesDeleted = imgRows;
    }
    Logger.log('✅ ImageEvents cleared: ' + results.imagesDeleted + ' rows');

    // 6. OTPStore — clear any leftover OTPs
    const otpSheet = getSheet(CONFIG.TABS.OTP_STORE);
    const otpRows  = otpSheet.getLastRow() - 1;
    if (otpRows > 0) otpSheet.deleteRows(2, otpRows);

    Logger.log('');
    Logger.log('════════ CLEANUP COMPLETE ════════');
    Logger.log('Documents deleted : ' + results.docsDeleted);
    Logger.log('Drive files trashed: ' + results.filesRemoved);
    Logger.log('AuditLog rows     : ' + results.auditCleared);
    Logger.log('Circulars         : ' + results.circularsCleared);
    Logger.log('Acknowledgements  : ' + results.ackCleared);
    Logger.log('Image records     : ' + results.imagesDeleted);
    if (results.errors.length) Logger.log('Errors: ' + results.errors.join(', '));
    Logger.log('══════════════════════════════════');

  } catch(e) {
    Logger.log('❌ Critical error: ' + e.toString());
  }
}

// ── Debug: dump recent Documents rows (uploader/status/state) ──
// Use this to diagnose "document not visible to others" issues.
function debugListRecentDocs(limit) {
  limit = limit || 15;
  const docs  = getSheetData(CONFIG.TABS.DOCUMENTS);
  const users = getSheetData(CONFIG.TABS.USERS);

  const recent = docs.slice(-limit);
  Logger.log('=== Last ' + recent.length + ' documents ===');
  recent.forEach(function(d) {
    const uploader = users.find(function(u) { return u.email === d.uploader_email; });
    Logger.log(
      'doc_id: ' + d.doc_id +
      ' | uploader: ' + d.uploader_name + ' (' + d.uploader_email + ')' +
      ' | uploader_role: ' + (uploader ? uploader.role : '???') +
      ' | status: [' + d.status + ']' +
      ' | state: [' + d.state + ']' +
      ' | target_component: [' + d.target_component + ']' +
      ' | subject: ' + d.subject
    );
  });

  Logger.log('');
  Logger.log('=== All active users (email | role | state) ===');
  users.filter(function(u){ return u.is_active === true; }).forEach(function(u) {
    Logger.log(u.email + ' | ' + u.role + ' | state: [' + u.state + ']');
  });
}

// ── FIX: add missing state/target_component columns + backfill ──
// Root cause: Documents sheet never had 'state'/'target_component' columns,
// so appendRow() silently dropped those fields for every upload (see
// SheetManager.gs appendRow — it only writes keys matching existing headers).
// This made matchesAudience('') return false, hiding docs from team_lead/
// state_lead/project_manager viewers. Run this once.
function fixDocumentsStateColumn() {
  const sheet   = getSheet(CONFIG.TABS.DOCUMENTS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // 1. Add missing columns
  ['target_component', 'state'].forEach(function(col) {
    if (!headers.includes(col)) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(col)
        .setBackground('#1a237e').setFontColor('#ffffff').setFontWeight('bold');
      Logger.log('Added column: ' + col);
      headers.push(col);
    }
  });

  // 2. Backfill blank 'state' on existing rows using the same logic uploadDocument() uses
  const users     = getSheetData(CONFIG.TABS.USERS);
  const stateCol  = headers.indexOf('state') + 1;
  const data      = sheet.getDataRange().getValues();
  const docHeaders = data[0];
  const emailCol  = docHeaders.indexOf('uploader_email');
  const stateColIdx = docHeaders.indexOf('state');

  let fixed = 0;
  for (let i = 1; i < data.length; i++) {
    const existingState = data[i][stateColIdx];
    if (existingState) continue; // already has a value, skip

    const uploaderEmail = data[i][emailCol];
    const uploader = users.find(function(u) { return u.email === uploaderEmail; });
    const role     = uploader ? (uploader.role || '').toLowerCase().trim() : '';
    const myState  = uploader ? (uploader.state || '') : '';
    const myGroup  = uploader && uploader.state_group ? uploader.state_group : getStateGroup(myState);

    let docState;
    switch (role) {
      case CONFIG.ROLES.MANAGER:
        docState = myState; break;
      case CONFIG.ROLES.TEAM_LEAD:
        docState = 'MANAGERS:' + myState; break;
      case CONFIG.ROLES.STATE_LEAD:
        docState = 'TEAM_LEADS:' + myState; break;
      case CONFIG.ROLES.PROJECT_MANAGER:
        docState = 'STATE_LEADS:' + myGroup; break;
      default:
        docState = 'ALL'; // it_admin, super_admin, ceo, communication, unknown
    }

    sheet.getRange(i + 1, stateColIdx + 1).setValue(docState);
    fixed++;
  }

  invalidateCache(CONFIG.TABS.DOCUMENTS);
  Logger.log('✅ Backfilled state on ' + fixed + ' document(s).');
}

// ── Run once to add a new user ──
function addUser_GauravMishra() {
  const sheet = getSheet(CONFIG.TABS.USERS);
  sheet.appendRow([
    'gaurav.mishra@educategirls.ngo',
    'Gaurav Mishra',
    'manager',
    'Civil',
    '',
    formatDate(new Date()),
    true
  ]);
  Logger.log('✅ Gaurav Mishra added successfully!');
}
