/* TekDex — contact form handling.
 *
 * Posts form data as JSON to the TekDex backend API at /tekdex-web/contact.
 * The backend emails the submission to consultations@tekdexinc.com and sends
 * an acknowledgement to the visitor. No data is persisted to a database.
 */
(function () {
  "use strict";

  var API_BASE = "https://dexify.tekdexinc.com/backend";
  var POST_PATH = "/tekdex-web/contact";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getEndpointUrl(form) {
    if (form && form.dataset.endpoint) {
      return form.dataset.endpoint;
    }
    if (window.TEKDEX_API_BASE) {
      return window.TEKDEX_API_BASE.replace(/\/+$/, "") + POST_PATH;
    }
    return API_BASE + POST_PATH;
  }

  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el && el.value ? el.value.trim() : "";
  }

  /* ── Inline validation note (below the form) ── */
  function notify(form, message, ok) {
    var box = form.querySelector(".td-form-note");
    if (!box) {
      box = document.createElement("p");
      box.className = "td-form-note";
      form.appendChild(box);
    }
    box.textContent = message;
    box.setAttribute("role", "status");
    box.classList.toggle("is-error", !ok);
  }

  function clearNotify(form) {
    var box = form.querySelector(".td-form-note");
    if (box) box.remove();
  }

  /* ── Toast notification system ── */
  function showToast(message, type) {
    // type: "success" | "error"
    var container = document.getElementById("td-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "td-toast-container";
      container.className = "td-toast-container";
      document.body.appendChild(container);
    }

    var toast = document.createElement("div");
    toast.className = "td-toast td-toast--" + type;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    var icon = type === "success"
      ? '<i class="fa-solid fa-circle-check"></i>'
      : '<i class="fa-solid fa-circle-exclamation"></i>';

    toast.innerHTML = '<span class="td-toast__icon">' + icon + '</span>' +
      '<span class="td-toast__msg">' + message + '</span>' +
      '<button class="td-toast__close" aria-label="Dismiss">&times;</button>';

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(function () {
      toast.classList.add("td-toast--visible");
    });

    // Close button
    toast.querySelector(".td-toast__close").addEventListener("click", function () {
      dismissToast(toast);
    });

    // Auto-dismiss after 6s
    setTimeout(function () { dismissToast(toast); }, 6000);
  }

  function dismissToast(toast) {
    if (toast.classList.contains("td-toast--dismissed")) return;
    toast.classList.add("td-toast--dismissed");
    toast.classList.remove("td-toast--visible");
    setTimeout(function () { toast.remove(); }, 350);
  }

  /* ── Submit handler ── */
  function handle(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var btn = form.querySelector('[type="submit"]');

    // Prevent duplicate submissions
    if (form.dataset.sending === "true") return;

    clearNotify(form);

    var name    = val(form, "name");
    var email   = val(form, "email");
    var service = val(form, "service");
    var message = val(form, "message") || val(form, "msg");

    // Validation
    if (!name) {
      notify(form, "Please enter your name.", false);
      form.querySelector('[name="name"]').focus();
      return;
    }
    if (name.length < 2 || name.length > 255) {
      notify(form, "Name must be between 2 and 255 characters.", false);
      form.querySelector('[name="name"]').focus();
      return;
    }
    if (!email) {
      notify(form, "Please enter your email address.", false);
      form.querySelector('[name="email"]').focus();
      return;
    }
    if (!EMAIL_RE.test(email)) {
      notify(form, "That email address does not look right — please check it.", false);
      form.querySelector('[name="email"]').focus();
      return;
    }
    if (!service) {
      notify(form, "Please tell us which service you're interested in.", false);
      form.querySelector('[name="service"]').focus();
      return;
    }
    if (service.length > 500) {
      notify(form, "Service field is too long (max 500 characters).", false);
      form.querySelector('[name="service"]').focus();
      return;
    }
    if (!message) {
      notify(form, "Please tell us about your requirements.", false);
      var msgEl = form.querySelector('[name="message"]') || form.querySelector('[name="msg"]');
      if (msgEl) msgEl.focus();
      return;
    }
    if (message.length > 10000) {
      notify(form, "Message is too long (max 10,000 characters).", false);
      return;
    }

    // Loading state
    form.dataset.sending = "true";
    var originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending\u2026';
    btn.disabled = true;
    btn.classList.add("is-sending");

    var payload = {
      name: name,
      email: email,
      serviceInterestedIn: service,
      message: message
    };

    fetch(getEndpointUrl(form), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    })
    .then(function (res) {
      return res.text().then(function (text) {
        var body = {};
        try {
          if (text) body = JSON.parse(text);
        } catch (e) {}
        return { ok: res.ok, status: res.status, body: body };
      });
    })
    .then(function (result) {
      if (result.ok) {
        showToast("Message sent successfully. We\u2019ll get back to you soon.", "success");
        form.reset();
        clearNotify(form);
      } else if (result.status === 400 && Array.isArray(result.body.message)) {
        notify(form, result.body.message[0], false);
      } else {
        console.error("API Error:", result.status, result.body);
        showToast("Unable to send your message. Please try again.", "error");
      }
    })
    .catch(function (err) {
      console.error("Fetch Error:", err);
      if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:") {
        console.warn("[TekDex Form] Note: Backend CORS policy restricts browser requests to https://tekdexinc.com and https://www.tekdexinc.com. Cross-origin browser requests from local dev origins are blocked by design. Set data-endpoint or window.TEKDEX_API_BASE to route through a local proxy/mock if testing locally.");
      }
      showToast("Unable to send your message. Please try again.", "error");
    })
    .finally(function () {
      form.dataset.sending = "false";
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      btn.classList.remove("is-sending");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var forms = document.querySelectorAll(
      'form#contact-form, form.contact-form-items, form[data-tekdex-contact]'
    );
    Array.prototype.forEach.call(forms, function (f) {
      f.setAttribute("novalidate", "novalidate");
      f.addEventListener("submit", handle);
    });
  });
})();


/* Reading-progress bar on article pages. Cheap, passive, and skipped entirely
 * when the element is not present or the visitor prefers reduced motion. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.querySelector(".td-art__progress span");
    var article = document.querySelector(".td-art__body");
    if (!bar || !article) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var ticking = false;
    function update() {
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var pct = total <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / total));
      bar.style.width = (pct * 100).toFixed(1) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  });
})();

/* TekDex — careers apply modal.
 *
 * One dialog serves every role; the button that opened it supplies the title.
 * A static host cannot receive a file, so without a configured endpoint the
 * form composes the same pre-filled email as the enquiry forms and asks the
 * applicant to attach the CV there — the file input still validates type and
 * size so nobody discovers the problem after writing a cover note.
 *
 * To accept uploads for real: set data-endpoint on the form and this POSTs a
 * multipart FormData (including the file) instead.
 */
(function () {
  "use strict";

  var INBOX = "consultations@tekdexinc.com";
  var MAX_BYTES = 5 * 1024 * 1024;
  var OK_EXT = /\.(pdf|doc|docx|rtf|txt)$/i;

  var modal = document.getElementById("td-apply");
  if (!modal) return;

  var form = modal.querySelector("[data-tekdex-apply]");
  var titleEl = modal.querySelector(".td-apply__title");
  var roleEl = form.querySelector('[name="role"]');
  var fileIn = form.querySelector('input[type="file"]');
  var fileWrap = modal.querySelector(".td-apply__file");
  var fileName = modal.querySelector(".td-apply__filename");
  var idleName = fileName.innerHTML;
  var lastFocused = null;

  function note(message, ok) {
    var box = form.querySelector(".td-form-note");
    if (!box) {
      box = document.createElement("p");
      box.className = "td-form-note";
      form.appendChild(box);
    }
    box.textContent = message;
    box.setAttribute("role", "status");
    box.classList.toggle("is-error", !ok);
  }

  function open(role, trigger) {
    lastFocused = trigger || null;
    titleEl.textContent = role || "This role";
    roleEl.value = role || "";
    modal.hidden = false;
    document.body.classList.add("td-modal-lock");
    var first = form.querySelector('input[name="name"]');
    if (first) first.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove("td-modal-lock");
    form.reset();
    fileWrap.classList.remove("has-file");
    fileName.innerHTML = idleName;
    var box = form.querySelector(".td-form-note");
    if (box) box.remove();
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener("click", function (e) {
    // Element-qualified on purpose: a bare ".td-apply-open" would also match
    // any ancestor that happens to carry the class.
    var opener = e.target.closest ? e.target.closest("button.td-apply-open, a.td-apply-open") : null;
    if (opener) {
      e.preventDefault();
      // Open Gmail compose with the job title from the data-role attribute
      var role = opener.getAttribute("data-role") || "This role";
      var subject = "Applying for " + role;
      var gmailUrl =
        "https://mail.google.com/mail/?view=cm&fs=1" +
        "&to=hr@tekdexinc.com" +
        "&su=" + encodeURIComponent(subject);
      window.open(gmailUrl, "_blank");
      return;
    }
    if (e.target.closest && e.target.closest("[data-td-close]")) {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) close();
  });

  fileIn.addEventListener("change", function () {
    var f = fileIn.files && fileIn.files[0];
    if (!f) {
      fileWrap.classList.remove("has-file");
      fileName.innerHTML = idleName;
      return;
    }
    fileWrap.classList.add("has-file");
    fileName.textContent = f.name + " (" + Math.max(1, Math.round(f.size / 1024)) + " KB)";
  });

  // NB: form.name is HTMLFormElement's own name property, not the field named
  // "name" — always go through querySelector here.
  function field(n) {
    var el = form.querySelector('[name="' + n + '"]');
    return el && el.value ? el.value.trim() : "";
  }

  form.addEventListener("submit", function (e) {
    var name = field("name");
    var email = field("email");
    var company = field("company");
    var file = fileIn.files && fileIn.files[0];

    if (!name || !email) {
      e.preventDefault();
      note("Please add your name and email.", false);
      return;
    }
    if (email.indexOf("@") < 1 || email.indexOf(".") < 0) {
      e.preventDefault();
      note("That email address does not look right — please check it.", false);
      return;
    }
    if (!file) {
      e.preventDefault();
      note("Please attach your resume — PDF or Word.", false);
      return;
    }
    if (!OK_EXT.test(file.name)) {
      e.preventDefault();
      note("Resume must be a PDF, Word, RTF or text file.", false);
      return;
    }
    if (file.size > MAX_BYTES) {
      e.preventDefault();
      note("That file is over 5 MB — please send a smaller one.", false);
      return;
    }

    // A real endpoint is configured: POST the file along with the fields.
    if (form.dataset.endpoint) {
      e.preventDefault();
      var data = new FormData(form);
      note("Sending your application…", true);
      fetch(form.dataset.endpoint, { method: "POST", body: data })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          note("Application received. We will be in touch.", true);
          setTimeout(close, 2200);
        })
        .catch(function () {
          note("That did not go through — please email " + INBOX + " instead.", false);
        });
      return;
    }

    // Static host: hand off to the applicant's mail client.
    e.preventDefault();
    var role = roleEl.value || "a role at TekDex";
    var body =
      "Role: " + role + "\n" +
      "Name: " + name + "\n" +
      "Email: " + email + "\n" +
      "Current company: " + (company || "—") + "\n\n" +
      "*** Please attach " + file.name + " to this email before sending. ***\n";

    window.location.href =
      "mailto:" + INBOX +
      "?subject=" + encodeURIComponent("Application: " + role) +
      "&body=" + encodeURIComponent(body);

    note("Opening your email app — attach " + file.name + " there, then send.", true);
  });
})();

/* TekDex — terms / privacy dialog.
 *
 * Both links used to go to contact.html, which answered neither question.
 * One dialog holds both panels; the link says which to show.
 */
(function () {
  "use strict";

  var modal = document.getElementById("td-legal");
  if (!modal) return;

  var panels = modal.querySelectorAll(".td-legal__panel");
  var closer = modal.querySelector(".td-modal__x");
  var lastFocused = null;

  function show(which) {
    Array.prototype.forEach.call(panels, function (p) {
      p.hidden = p.id !== "td-legal-" + which;
    });
    var open = modal.querySelector(".td-legal__panel:not([hidden])");
    if (!open) panels[0].hidden = false;
    modal.hidden = false;
    document.body.classList.add("td-modal-lock");
    var body = modal.querySelector(".td-legal__panel:not([hidden]) .td-legal__body");
    if (body) body.scrollTop = 0;
    if (closer) closer.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove("td-modal-lock");
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var link = e.target.closest("[data-td-legal]");
    if (link) {
      e.preventDefault();
      lastFocused = link;
      show(link.getAttribute("data-td-legal"));
      return;
    }
    if (!modal.hidden && e.target.closest("[data-td-close]")) {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) close();
  });
})();

/* TekDex — light / dark theme.
 *
 * The stored choice wins; without one we follow the operating system and keep
 * following it until the visitor picks a side. The <html> attribute is set by
 * a small inline script in the head so the page never flashes light first —
 * this file only handles the button and the OS-change listener.
 */
(function () {
  "use strict";

  var KEY = "td-theme";
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function apply(mode) {
    root.setAttribute("data-theme", mode);
    var pressed = mode === "dark";
    var buttons = document.querySelectorAll("[data-td-theme-toggle]");
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute("aria-pressed", pressed ? "true" : "false");
      b.title = pressed ? "Switch to light" : "Switch to dark";
    });
  }

  apply(root.getAttribute("data-theme") ||
        (mq && mq.matches ? "dark" : "light"));

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-td-theme-toggle]");
    if (!btn) return;
    e.preventDefault();
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch (err) {}
    apply(next);
  });

  // Only track the OS while the visitor has not chosen for themselves.
  if (mq && mq.addEventListener) {
    mq.addEventListener("change", function (e) {
      if (!stored()) apply(e.matches ? "dark" : "light");
    });
  }
})();
