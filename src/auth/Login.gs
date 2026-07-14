// ── OTP Rate Limiting ─────────────────────────────────────────
const OTP_MAX_ATTEMPTS  = 5;
const OTP_LOCK_MINUTES  = 15;
const OTP_ATTEMPT_PREFIX = 'OTP_ATTEMPT_';

function _getAttemptData(email) {
  const raw = PropertiesService.getScriptProperties().getProperty(OTP_ATTEMPT_PREFIX + email);
  return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
}

function _saveAttemptData(email, data) {
  PropertiesService.getScriptProperties().setProperty(OTP_ATTEMPT_PREFIX + email, JSON.stringify(data));
}

function _clearAttemptData(email) {
  PropertiesService.getScriptProperties().deleteProperty(OTP_ATTEMPT_PREFIX + email);
}

function _checkRateLimit(email) {
  const data = _getAttemptData(email);
  const now  = new Date().getTime();
  if (data.lockedUntil && now < data.lockedUntil) {
    const minsLeft = Math.ceil((data.lockedUntil - now) / 60000);
    throw new Error('Too many failed attempts. Please try again after ' + minsLeft + ' minutes.');
  }
}

function _recordFailedAttempt(email) {
  const data = _getAttemptData(email);
  const now  = new Date().getTime();
  // Reset count if previous lock has expired
  if (data.lockedUntil && now >= data.lockedUntil) {
    data.count = 0; data.lockedUntil = 0;
  }
  data.count += 1;
  if (data.count >= OTP_MAX_ATTEMPTS) {
    data.lockedUntil = now + OTP_LOCK_MINUTES * 60 * 1000;
  }
  _saveAttemptData(email, data);
}

function sendOTP(email) {
  try {
    email = email.trim().toLowerCase();

    if (!isValidDomain(email)) {
      return errorResponse('Only ' + CONFIG.DOMAINS.join(' or ') + ' email addresses are allowed.');
    }

    const user = getUserByEmail(email);
    if (!user) {
      return errorResponse('This email is not registered. Please contact the administrator.');
    }

    // Check rate limit before sending
    _checkRateLimit(email);

    // Clear old OTPs for this email
    _clearOldOTPs(email);

    const otp = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000);

    appendRow(CONFIG.TABS.OTP_STORE, {
      email:      email,
      otp:        otp,
      expires_at: expiresAt.getTime(),   // store epoch millis — avoids dd-MM-yyyy parse bug
      used:       false
    });

    _sendOTPEmail(email, user.name, otp);

    writeAuditLog(email, user.name, 'OTP_SENT', '', '');

    return successResponse({ message: 'OTP sent successfully to your email.' });

  } catch (e) {
    console.error('sendOTP error:', e);
    return errorResponse(e.message || 'Failed to send OTP. Please try again.');
  }
}

function verifyOTP(email, enteredOTP) {
  try {
    email = email.trim().toLowerCase();
    enteredOTP = enteredOTP.trim();

    // Check rate limit before verifying
    _checkRateLimit(email);

    const sheet = getSheet(CONFIG.TABS.OTP_STORE);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return errorResponse('Invalid OTP.');

    const headers = data[0];
    const emailCol   = headers.indexOf('email');
    const otpCol     = headers.indexOf('otp');
    const expiresCol = headers.indexOf('expires_at');
    const usedCol    = headers.indexOf('used');

    const now = new Date();
    let matchRow = -1;

    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (row[emailCol] !== email) continue;
      if (row[usedCol] === true) continue;

      // expires_at is stored as epoch millis (number). Old string rows → NaN → treat as not-expired
      // (they are already marked used by _clearOldOTPs, so they won't false-match anyway).
      const expMs = Number(row[expiresCol]);
      if (!isNaN(expMs) && now.getTime() > expMs) continue;

      if (row[otpCol].toString() === enteredOTP) {
        matchRow = i + 1;
        break;
      }
    }

    if (matchRow === -1) {
      _recordFailedAttempt(email);
      const data = _getAttemptData(email);
      const remaining = OTP_MAX_ATTEMPTS - data.count;
      if (data.lockedUntil) {
        return errorResponse('Too many failed attempts. Account locked for ' + OTP_LOCK_MINUTES + ' minutes.');
      }
      return errorResponse('Invalid or expired OTP. ' + remaining + ' attempt(s) remaining.');
    }

    // Mark OTP as used and clear failed attempts on success
    sheet.getRange(matchRow, usedCol + 1).setValue(true);
    _clearAttemptData(email);

    const user        = getUserByEmail(email);
    const userState   = user.state       || '';
    const stateGroup  = user.state_group || getStateGroup(userState);
    const component   = user.component_access || '';
    const token       = _createSession(email, user.role, user.name, userState, stateGroup, component);

    writeAuditLog(email, user.name, 'LOGIN_SUCCESS', '', '');

    return successResponse({
      token:       token,
      email:       email,
      role:        user.role,
      name:        user.name,
      state:       userState,
      state_group: stateGroup,
      component:   component
    });

  } catch (e) {
    console.error('verifyOTP error:', e);
    return errorResponse(e.message || 'Verification failed. Please try again.');
  }
}

function _sendOTPEmail(email, name, otp) {
  const subject = 'Document Management System: Your Login OTP';
  const body =
    'Dear ' + name + ',\n\n' +
    'You have requested a One-Time Password (OTP) to log in to the Document Management System.\n\n' +
    'Your OTP is:\n\n' +
    '        ' + otp + '\n\n' +
    'This OTP is valid for ' + CONFIG.OTP_EXPIRY_MINUTES + ' minutes. Please do not share it with anyone.\n\n' +
    'If you did not request this OTP, please ignore this email.\n\n' +
    'Regards,\n' +
    'Technical Assistant Unit\n' +
    'Educate Girls';

  GmailApp.sendEmail(email, subject, body);
}

function _clearOldOTPs(email) {
  const sheet = getSheet(CONFIG.TABS.OTP_STORE);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  const emailCol = data[0].indexOf('email');
  const usedCol  = data[0].indexOf('used');
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][emailCol] === email && data[i][usedCol] !== true) {
      sheet.getRange(i + 1, usedCol + 1).setValue(true);
    }
  }
}
