/* ═════════════════════════════════════════════════════════════
   public/js/register-validation.js
   Client-side validation for student and alumni registration forms.
   Works for both #studentRegForm and #alumniRegForm.
════════════════════════════════════════════════════════════= */

(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────── */
  function showError(fieldId, msg) {
    const input = document.getElementById(fieldId);
    const errEl = document.getElementById(fieldId + '-error');
    if (input) input.classList.add('is-invalid');
    if (errEl) errEl.textContent = msg;
  }
  function clearError(fieldId) {
    const input = document.getElementById(fieldId);
    const errEl = document.getElementById(fieldId + '-error');
    if (input) input.classList.remove('is-invalid');
    if (errEl) errEl.textContent = '';
  }
  function showFieldError(input, msg) {
    input.classList.add('is-invalid');
    const errEl = document.getElementById(input.id + '-error');
    if (errEl) errEl.textContent = msg;
  }
  function clearFieldError(input) {
    input.classList.remove('is-invalid');
    const errEl = document.getElementById(input.id + '-error');
    if (errEl) errEl.textContent = '';
  }

  /* ── Password strength meter ─────────────────────────────── */
  function checkStrength(password, fillId, labelId) {
    const fill  = document.getElementById(fillId);
    const label = document.getElementById(labelId);
    if (!fill || !label) return;

    let score = 0;
    if (password.length >= 8)             score++;
    if (/[A-Z]/.test(password))           score++;
    if (/[a-z]/.test(password))           score++;
    if (/[0-9]/.test(password))           score++;
    if (/[^A-Za-z0-9]/.test(password))    score++;

    const levels = [
      { pct: '0%',   color: 'transparent', text: '' },
      { pct: '25%',  color: '#ef4444',     text: '⚠️ Very weak' },
      { pct: '50%',  color: '#f97316',     text: '🟠 Weak' },
      { pct: '75%',  color: '#f59e0b',     text: '🟡 Moderate' },
      { pct: '90%',  color: '#10b981',     text: '🟢 Strong' },
      { pct: '100%', color: '#059669',     text: '✅ Very strong' },
    ];
    const level = levels[Math.min(score, 5)];
    fill.style.width           = level.pct;
    fill.style.backgroundColor = level.color;
    label.textContent          = level.text;
    label.style.color          = level.color;
  }

  /* ── Password show/hide toggle ───────────────────────────── */
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input    = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type       = 'text';
        btn.textContent  = '🙈';
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        input.type       = 'password';
        btn.textContent  = '👁';
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });

  /* ── Live strength meter wiring ──────────────────────────── */
  const pwdStudent = document.getElementById('password');
  const pwdAlumni  = document.getElementById('a-password');

  if (pwdStudent) {
    pwdStudent.addEventListener('input', () =>
      checkStrength(pwdStudent.value, 'strengthFill', 'strengthLabel'));
  }
  if (pwdAlumni) {
    pwdAlumni.addEventListener('input', () =>
      checkStrength(pwdAlumni.value, 'aStrengthFill', 'aStrengthLabel'));
  }

  /* ── File drop zone ──────────────────────────────────────── */
  function setupFileDropZone(zoneId, inputId, contentId, infoId, nameId, removeId) {
    const zone    = document.getElementById(zoneId);
    const input   = document.getElementById(inputId);
    const content = document.getElementById(contentId);
    const info    = document.getElementById(infoId);
    const nameEl  = document.getElementById(nameId);
    const removeBtn = document.getElementById(removeId);

    if (!zone || !input) return;

    const MAX_MB = 5;

    function displayFile(file) {
      if (!file) return;
      // Validate type
      const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowed.includes(file.type)) {
        const errEl = document.getElementById(inputId + '-error') ||
                      document.getElementById(zoneId.replace('DropZone','') + '-doc-error');
        if (errEl) errEl.textContent = 'Only PDF, JPG, or PNG files are allowed.';
        return;
      }
      // Validate size
      if (file.size > MAX_MB * 1024 * 1024) {
        const errEl = document.getElementById(inputId + '-error') ||
                      document.getElementById('doc-error') ||
                      document.getElementById('a-doc-error');
        if (errEl) errEl.textContent = `File must be smaller than ${MAX_MB} MB.`;
        return;
      }
      if (content) content.style.display = 'none';
      if (info)    info.style.display    = 'flex';
      if (nameEl)  nameEl.textContent    = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
      zone.classList.add('file-selected');
    }

    function clearFile() {
      input.value = '';
      if (content) content.style.display = 'flex';
      if (info)    info.style.display    = 'none';
      if (nameEl)  nameEl.textContent    = 'No file chosen';
      zone.classList.remove('file-selected');
    }

    // Click on zone → trigger file input
    zone.addEventListener('click', e => {
      if (e.target !== removeBtn) input.click();
    });
    zone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });

    // File selected via input
    input.addEventListener('change', () => {
      if (input.files && input.files[0]) displayFile(input.files[0]);
    });

    // Drag and drop
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        // Manually assign to input via DataTransfer
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        displayFile(file);
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        clearFile();
      });
    }
  }

  // Wire both drop zones
  setupFileDropZone(
    'fileDropZone', 'document', 'fileDropContent',
    'fileSelectedInfo', 'selectedFileName', 'fileRemoveBtn'
  );
  setupFileDropZone(
    'aFileDropZone', 'a-document', 'aFileDropContent',
    'aFileSelectedInfo', 'aSelectedFileName', 'aFileRemoveBtn'
  );

  /* ── Main form validation ────────────────────────────────── */
  function validateForm(form) {
    if (!form) return;

    const isStudent = form.id === 'studentRegForm';
    let valid = true;

    /* Helper: get field value by name */
    function val(name) {
      const el = form.querySelector(`[name="${name}"]`);
      return el ? el.value.trim() : '';
    }
    function elByName(name) {
      return form.querySelector(`[name="${name}"]`);
    }
    function pfx(id) {
      // student IDs are plain; alumni IDs are prefixed with 'a-'
      return isStudent ? id : 'a-' + id;
    }

    // Full name
    const nameId = isStudent ? 'fullName' : 'a-fullName';
    if (!val('fullName')) {
      showError(nameId, 'Full name is required.'); valid = false;
    } else { clearError(nameId); }

    // Email
    const emailId = isStudent ? 'email' : 'a-email';
    const emailVal = val('email');
    if (!emailVal) {
      showError(emailId, 'Email address is required.'); valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showError(emailId, 'Enter a valid email address.'); valid = false;
    } else { clearError(emailId); }

    // Mobile (optional but must be valid if filled)
    const mobileId = isStudent ? 'mobile' : 'a-mobile';
    const mobileVal = val('mobile');
    if (mobileVal && !/^[6-9][0-9]{9}$/.test(mobileVal)) {
      showError(mobileId, 'Enter a valid 10-digit Indian mobile number.'); valid = false;
    } else { clearError(mobileId); }

    // Roll number
    const rollId = isStudent ? 'rollNumber' : 'a-rollNumber';
    if (!val('rollNumber')) {
      showError(rollId, 'MCA roll number is required.'); valid = false;
    } else { clearError(rollId); }

    // Admission batch
    const batchId = isStudent ? 'admissionBatch' : 'a-admissionBatch';
    const batchVal = val('admissionBatch');
    if (!batchVal) {
      showError(batchId, 'Admission batch year is required.'); valid = false;
    } else if (!/^[0-9]{4}$/.test(batchVal)) {
      showError(batchId, 'Enter a valid 4-digit year (e.g. 2023).'); valid = false;
    } else { clearError(batchId); }

    if (isStudent) {
      // Year of study
      if (!val('currentYear')) {
        showError('currentYear', 'Please select your current year of study.'); valid = false;
      } else { clearError('currentYear'); }

      // Expected graduation
      const egVal = val('expectedGradYear');
      if (!egVal) {
        showError('expectedGradYear', 'Expected graduation year is required.'); valid = false;
      } else if (!/^[0-9]{4}$/.test(egVal)) {
        showError('expectedGradYear', 'Enter a valid 4-digit year.'); valid = false;
      } else { clearError('expectedGradYear'); }

    } else {
      // Graduation year (alumni)
      const gyVal = val('graduationYear');
      if (!gyVal) {
        showError('a-gradYear', 'MCA graduation year is required.'); valid = false;
      } else if (!/^[0-9]{4}$/.test(gyVal)) {
        showError('a-gradYear', 'Enter a valid 4-digit year.'); valid = false;
      } else { clearError('a-gradYear'); }

      // LinkedIn (optional but must be URL if filled)
      const liVal = val('linkedin');
      if (liVal && !/^https?:\/\/.+/.test(liVal)) {
        showError('a-linkedin', 'LinkedIn URL must start with https://'); valid = false;
      } else { clearError('a-linkedin'); }
    }

    // Document upload
    const docInput = isStudent
      ? document.getElementById('document')
      : document.getElementById('a-document');
    const docErrId = isStudent ? 'doc-error' : 'a-doc-error';
    const docErr   = document.getElementById(docErrId);
    if (!docInput || !docInput.files || docInput.files.length === 0) {
      if (docErr) docErr.textContent = 'Please upload your document.';
      valid = false;
    } else {
      if (docErr) docErr.textContent = '';
    }

    // Password
    const pwId  = isStudent ? 'password'        : 'a-password';
    const cpId  = isStudent ? 'confirmPassword' : 'a-confirmPassword';
    const pwVal = val('password');
    const cpVal = val('confirmPassword');

    if (!pwVal) {
      showError(pwId, 'Password is required.'); valid = false;
    } else if (pwVal.length < 8) {
      showError(pwId, 'Password must be at least 8 characters.'); valid = false;
    } else if (!/[a-zA-Z]/.test(pwVal) || !/[0-9]/.test(pwVal)) {
      showError(pwId, 'Password must contain at least one letter and one number.'); valid = false;
    } else { clearError(pwId); }

    if (!cpVal) {
      showError(cpId, 'Please confirm your password.'); valid = false;
    } else if (pwVal !== cpVal) {
      showError(cpId, 'Passwords do not match.'); valid = false;
    } else { clearError(cpId); }

    // Terms
    const termsId = isStudent ? 'terms' : 'a-terms';
    const termsEl = form.querySelector('[name="terms"]');
    const termsErrEl = document.getElementById(termsId + '-error');
    if (!termsEl || !termsEl.checked) {
      if (termsErrEl) termsErrEl.textContent = 'You must accept the terms and conditions.';
      valid = false;
    } else {
      if (termsErrEl) termsErrEl.textContent = '';
    }

    return valid;
  }

  /* ── Wire up both forms ──────────────────────────────────── */
  ['studentRegForm', 'alumniRegForm'].forEach(formId => {
    const form = document.getElementById(formId);
    if (!form) return;

    // Clear errors on input
    form.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('input', () => clearFieldError(input));
    });

    form.addEventListener('submit', function (e) {
      const isValid = validateForm(form);
      if (!isValid) {
        e.preventDefault();
        // Scroll to first error
        const firstErr = form.querySelector('.is-invalid, .form-error:not(:empty)');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Show spinner on button
        const btn     = form.querySelector('.btn-submit');
        const btnText = form.querySelector('.btn-text');
        const spinner = form.querySelector('.btn-spinner');
        if (btn) btn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (spinner) spinner.style.display = 'inline';
      }
    });
  });

  /* ── Progress steps visual update ───────────────────────── */
  // Optional: highlight step as user fills each section
  function updateSteps(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const sections = form.querySelectorAll('.form-section');
    const steps    = form.closest('.auth-form-card')?.querySelectorAll('.reg-step');
    if (!steps) return;

    sections.forEach((section, i) => {
      const inputs = section.querySelectorAll('.form-control, input[type="checkbox"]');
      inputs.forEach(input => {
        input.addEventListener('change', () => {
          if (steps[i]) steps[i].classList.add('done');
          if (steps[i + 1]) steps[i + 1].classList.add('active');
        });
      });
    });
  }
  updateSteps('studentRegForm');
  updateSteps('alumniRegForm');

})();
