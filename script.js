const header = document.querySelector('.header');
const burger = document.querySelector('.burger');
const menuLinks = document.querySelectorAll('.header__menu a, .nav a');

function sanitizeText(value, maxLength = 80) {
  return String(value)
    .replace(/[\0<>\u2028\u2029]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeUtm(value, maxLength = 100) {
  return String(value)
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, maxLength);
}

function normalizePhone(value) {
  let digits = String(value).replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `7${digits}`;
  }

  return digits;
}

function isValidPhone(value) {
  return /^7\d{10}$/.test(normalizePhone(value));
}

function formatPhoneDisplay(value) {
  const digits = normalizePhone(value);
  if (!/^7\d{10}$/.test(digits)) return sanitizeText(value, 20);
  return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

function getFormField(form, name) {
  return form.querySelector(`[name="${name}"]`);
}

function setFieldError(field, message) {
  if (!field) return;
  field.setCustomValidity(message);
  field.reportValidity();
}

function clearFieldError(field) {
  if (!field) return;
  field.setCustomValidity('');
}

function closeNav() {
  header?.classList.remove('nav-open');
  burger?.setAttribute('aria-expanded', 'false');
}

burger?.addEventListener('click', () => {
  const isOpen = header.classList.toggle('nav-open');
  burger.setAttribute('aria-expanded', isOpen);
});

menuLinks.forEach(link => {
  link.addEventListener('click', closeNav);
});

document.addEventListener('click', e => {
  if (!header?.classList.contains('nav-open')) return;
  if (header.contains(e.target)) return;
  closeNav();
});

function scrollToHash(hash, focusSelector) {
  if (!hash || hash === '#') return;
  const target = document.querySelector(hash);
  if (!target) return;
  const offset = header?.offsetHeight ?? 64;
  const top = target.getBoundingClientRect().top + window.scrollY - offset - 8;
  window.scrollTo({ top, behavior: 'smooth' });
  if (focusSelector) {
    target.querySelector(focusSelector)?.focus({ preventScroll: true });
  }
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    scrollToHash(hash, hash === '#order' ? 'input[name="name"]' : null);
    closeNav();
  });
});

(function captureUtm() {
  const params = new URLSearchParams(window.location.search);
  const source = document.getElementById('utm-source');
  const campaign = document.getElementById('utm-campaign');

  if (source) {
    source.value = sanitizeUtm(params.get('utm_source') || '');
  }
  if (campaign) {
    campaign.value = sanitizeUtm(params.get('utm_campaign') || '');
  }
})();

(function initMobileBar() {
  const mq = window.matchMedia('(max-width: 768px)');
  const apply = () => {
    document.body.classList.toggle('has-mobile-bar', mq.matches);
  };
  apply();
  mq.addEventListener('change', apply);
})();

document.querySelectorAll('.faq__item').forEach(item => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    document.querySelectorAll('.faq__item').forEach(other => {
      if (other !== item) other.open = false;
    });
  });
});

const modal = document.getElementById('order-modal');
const orderForm = document.getElementById('order-form');
const orderSuccess = document.getElementById('order-success');
const modalContent = modal?.querySelector('.modal__content');
const modalOverlay = modal?.querySelector('.modal__overlay');
const modalDialog = modal?.querySelector('.modal__dialog');
let scrollLockY = 0;

function lockScroll() {
  scrollLockY = window.scrollY;
  document.body.classList.add('modal-open');
  document.body.style.top = `-${scrollLockY}px`;
}

function unlockScroll() {
  document.body.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo(0, scrollLockY);
}

function openModal() {
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  lockScroll();
  closeNav();
  orderForm?.reset();
  orderForm?.querySelectorAll('[name="name"], [name="phone"]').forEach(clearFieldError);
  if (modalContent) modalContent.hidden = false;
  orderSuccess?.setAttribute('hidden', '');
  getFormField(orderForm, 'name')?.focus();
}

function closeModal() {
  if (!modal?.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  unlockScroll();
}

document.querySelectorAll('.js-order-btn').forEach(btn => {
  btn.addEventListener('click', openModal);
});

modal?.querySelectorAll('[data-modal-close]').forEach(el => {
  el.addEventListener('click', closeModal);
});

modalOverlay?.addEventListener('click', e => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

modalDialog?.addEventListener('click', e => {
  e.stopPropagation();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;

  if (modal?.classList.contains('is-open')) {
    closeModal();
    return;
  }

  if (header?.classList.contains('nav-open')) {
    closeNav();
  }
});

function readFormData(form) {
  const nameField = getFormField(form, 'name');
  const phoneField = getFormField(form, 'phone');
  const utmSourceField = getFormField(form, 'utm_source');
  const utmCampaignField = getFormField(form, 'utm_campaign');

  return {
    nameField,
    phoneField,
    data: {
      name: sanitizeText(nameField?.value ?? ''),
      phone: sanitizeText(phoneField?.value ?? '', 20),
      utmSource: sanitizeUtm(utmSourceField?.value ?? ''),
      utmCampaign: sanitizeUtm(utmCampaignField?.value ?? '')
    }
  };
}

function setSuccessMessage(element, name) {
  if (!element) return;
  element.textContent = `Заявка отправлена! Спасибо, ${name}. Менеджер свяжется с вами в ближайшее время.`;
}

function handleFormSubmit(form, onSuccess) {
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (form.dataset.submitting === 'true') return;

    const { nameField, phoneField, data } = readFormData(form);

    if (!validateFormData({ nameField, phoneField }, data)) return;

    setSubmitting(form, true);

    try {
      await Promise.resolve(onSuccess(data));
    } catch {
      setSubmitting(form, false);
    }
  });
}

function validateFormData(fields, data) {
  const { nameField, phoneField } = fields;

  clearFieldError(nameField);
  clearFieldError(phoneField);

  if (!data.name) {
    setFieldError(nameField, 'Укажите ваше имя');
    return false;
  }

  if (!/^[a-zA-Zа-яА-ЯёЁ\s\-'.]{2,80}$/u.test(data.name)) {
    setFieldError(nameField, 'Имя может содержать только буквы');
    return false;
  }

  if (!data.phone) {
    setFieldError(phoneField, 'Укажите номер телефона');
    return false;
  }

  if (!isValidPhone(data.phone)) {
    setFieldError(phoneField, 'Введите корректный номер: +7 и 10 цифр');
    return false;
  }

  data.phone = formatPhoneDisplay(data.phone);
  return true;
}

function setSubmitting(form, isSubmitting) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) return;

  submitBtn.disabled = isSubmitting;
  submitBtn.setAttribute('aria-busy', String(isSubmitting));
  form.dataset.submitting = isSubmitting ? 'true' : 'false';
}

handleFormSubmit(orderForm, data => {
  if (modalContent) modalContent.hidden = true;
  orderSuccess?.removeAttribute('hidden');

  const successText = orderSuccess?.querySelector('[data-success-text]');
  if (successText) {
    successText.textContent = `Спасибо, ${data.name}! Менеджер свяжется с вами по номеру ${data.phone}.`;
  }
});

const inlineForm = document.getElementById('order-form-inline');
const inlineSuccess = document.getElementById('inline-form-success');

handleFormSubmit(inlineForm, data => {
  inlineForm.querySelector('button[type="submit"]')?.setAttribute('hidden', '');
  inlineForm.querySelectorAll('.order-form__field, .order-form__note').forEach(el => {
    el.setAttribute('hidden', '');
  });
  inlineSuccess?.removeAttribute('hidden');
  setSuccessMessage(inlineSuccess, data.name);
});

document.querySelectorAll('input[name="phone"]').forEach(input => {
  input.addEventListener('input', () => clearFieldError(input));
});

document.querySelectorAll('input[name="name"]').forEach(input => {
  input.addEventListener('input', () => clearFieldError(input));
});

function isGitHubPages() {
  return window.location.hostname.endsWith('github.io');
}

function getGitHubRawBase() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const project = segments[0] || 'logistic';
  const user = window.location.hostname.split('.')[0];
  return `https://raw.githubusercontent.com/${user}/${project}/main`;
}

function resolveAssetPath(relativePath) {
  if (/^https?:\/\//i.test(relativePath)) {
    const url = new URL(relativePath);
    url.searchParams.set('v', '7');
    return url.href;
  }

  const cleanPath = relativePath.replace(/^\.\//, '');
  const url = new URL(cleanPath, document.baseURI);
  url.searchParams.set('v', '7');
  return url.href;
}

function getServiceImageCandidates(baseName) {
  const extensions = ['png', 'jpg', 'jpeg', 'webp'];
  const folders = ['assets/images/', 'assets/', ''];
  const candidates = [];

  folders.forEach(folder => {
    extensions.forEach(ext => {
      candidates.push(`${folder}${baseName}.${ext}`);
    });
  });

  if (isGitHubPages()) {
    const raw = getGitHubRawBase();
    ['assets/images/', 'assets/', ''].forEach(folder => {
      extensions.forEach(ext => {
        candidates.push(`${raw}/${folder}${baseName}.${ext}`);
      });
    });
  }

  return [...new Set(candidates)];
}

function getLogoCandidates() {
  const paths = ['assets/logo.png', 'logo.png'];

  if (isGitHubPages()) {
    const raw = getGitHubRawBase();
    paths.push(`${raw}/assets/logo.png`, `${raw}/logo.png`);
  }

  return paths;
}

function loadImageWithFallback(img) {
  const baseName = img.dataset.image;
  if (!baseName) return;

  const candidates = getServiceImageCandidates(baseName);
  let index = 0;

  const tryNextSource = () => {
    if (index >= candidates.length) {
      img.removeEventListener('error', onImageError);
      img.classList.add('is-error');
      img.closest('.service-card__media')?.classList.add('is-image-error');
      return;
    }

    img.src = resolveAssetPath(candidates[index]);
    index += 1;
  };

  const onImageError = () => tryNextSource();

  img.addEventListener('error', onImageError);
  tryNextSource();
}

function initLogoFallbacks() {
  document.querySelectorAll('.logo img, .footer__brand img').forEach(img => {
    const candidates = getLogoCandidates();
    let index = 0;

    const tryNextSource = () => {
      if (index >= candidates.length) return;
      img.src = resolveAssetPath(candidates[index]);
      index += 1;
    };

    img.addEventListener('error', tryNextSource);
    tryNextSource();
  });
}

document.querySelectorAll('.service-card__image').forEach(loadImageWithFallback);
initLogoFallbacks();
