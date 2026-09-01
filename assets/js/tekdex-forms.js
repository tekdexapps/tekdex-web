/* TekDex — contact form handling.
 *
 * The template posted to contact.php, which cannot run on a static host, so
 * submitting produced a 404. Until a real endpoint is wired up, every enquiry
 * form composes a pre-filled email to consultations@tekdexinc.com instead. That
 * needs no backend, no third-party service, and loses nothing.
 *
 * To switch to a real endpoint later: set data-endpoint on the <form> (e.g. a
 * Formspree/Web3Forms URL or your own handler) and this falls back to a normal
 * POST.
 */
(function () {
  "use strict";

  var INBOX = "consultations@tekdexinc.com";

  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el && el.value ? el.value.trim() : "";
  }

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

  function handle(e) {
    var form = e.currentTarget;

    // A real endpoint was configured — let the browser submit normally.
    if (form.dataset.endpoint) {
      form.action = form.dataset.endpoint;
      return;
    }

    e.preventDefault();

    var name = val(form, "name");
    var email = val(form, "email");
    var service = val(form, "service");
    var message = val(form, "message") || val(form, "msg");

    if (!name || !email || !message) {
      notify(form, "Please add your name, email, and a message before sending.", false);
      return;
    }
    if (email.indexOf("@") < 1 || email.indexOf(".") < 0) {
      notify(form, "That email address does not look right — please check it.", false);
      return;
    }

    var subject = service
      ? "Enquiry: " + service + " — " + name
      : "Website enquiry from " + name;
    var body =
      "Name: " + name + "\n" +
      "Email: " + email + "\n" +
      (service ? "Service interested in: " + service + "\n" : "") +
      "\n" + message + "\n";

    window.location.href =
      "mailto:" + INBOX +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    notify(form, "Opening your email app — press send there and we'll pick it up.", true);
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
      open(opener.getAttribute("data-role"), opener);
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
