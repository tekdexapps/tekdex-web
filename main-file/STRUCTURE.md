# Project Folder Structure & Theme Components

This document describes the folder structure and how shared theme layout is organized to avoid duplicate code across pages.

## Folder Structure

```
main-file/
├── assets/                 # Static assets (one place for theme CSS/JS/images)
│   ├── css/                # Compiled & vendor CSS (main.css = theme)
│   ├── js/                 # Scripts (main.js, includes.js, includes-init.js)
│   ├── img/                # Images, icons, logos
│   └── scss/               # Source SCSS (_variables.scss = theme colors)
├── components/             # Shared HTML partials (single source for layout)
│   ├── _head-common.html   # Meta, favicon, theme styles (reference only)
│   ├── header.html         # Site header + navigation
│   ├── footer.html         # Site footer + widgets + copyright
│   ├── preloader.html      # Loading overlay
│   ├── offcanvas.html      # Mobile / offcanvas menu
│   └── search.html         # Search overlay
├── index.html              # Home (and other pages at root)
├── about.html
├── career.html
├── contact.html
├── service.html
├── service-details.html
├── service-carousel.html
├── project.html
├── project-details.html
├── project-carousel.html
├── team.html
├── team-details.html
├── team-carousel.html
├── pricing.html
├── news.html
├── news-standard.html
├── news-details.html
├── faq.html
├── 404.html
├── index-2.html
├── index-3.html
├── index-one-page.html
├── index-two-page.html
├── index-three-page.html
└── STRUCTURE.md            # This file
```

## Theme in One Place

- **Colors & variables:** `assets/scss/_variables.scss` (and compiled into `assets/css/main.css`).  
  TekDex theme uses: `--theme: #dd5907`, `--theme2: #ef8145`, `--text: #808183`, `--title-color: #000000`, `--smoke-color: #e8e0dc`.
- **Header / footer / preloader / offcanvas / search:** `components/*.html`.  
  Edit these once; use either **component loading** (see below) or copy-paste into new pages.

## Using Shared Components (No Duplicate Layout)

To avoid repeating header/footer/preloader/offcanvas on every page:

1. **Use placeholder containers** in your HTML:

   ```html
   <body data-page-id="career">
     <div id="preloader-container"></div>
     <div class="mouse-cursor cursor-outer"></div>
     <div class="mouse-cursor cursor-inner"></div>
     <div id="offcanvas-container"></div>
     <div id="header-container"></div>
     <div id="search-container"></div>
     <main id="main-content">
       <!-- Page content only -->
     </main>
     <div id="footer-container"></div>
   </body>
   ```

2. **Load the includes script** (after jQuery, before or after main.js):

   ```html
   <script src="assets/js/jquery-3.7.1.min.js"></script>
   <!-- ... other scripts ... -->
   <script src="assets/js/includes.js"></script>
   <script src="assets/js/includes-init.js"></script>
   ```

3. **Set `data-page-id`** on `<body>` to the current page (e.g. `career`, `about`, `contact`) so the correct nav item gets the active class.

4. **Run the site over HTTP** (e.g. `npx serve .` or your server). Component loading uses `XMLHttpRequest`; `file://` may be blocked by the browser.

**Example:** `career.html` uses this pattern (placeholders + `includes.js` + `includes-init.js`). Other pages can be migrated the same way for a single source of theme layout.

## Optional: Subfolder for Pages

If you move pages into a subfolder (e.g. `pages/`), set the base path so components and assets still load:

- Keep `index.html` at root; put other pages in `pages/about.html`, `pages/career.html`, etc.
- In each page under `pages/`, set:

  ```html
  <script>window.PAGE_BASE = '../';</script>
  ```

  and use asset/script paths like `../assets/...`, `../components/...`.

## Summary

- **One theme:** SCSS variables + `main.css`; layout in `components/`.
- **No duplicate layout:** Use `components/*.html` with `includes.js` + placeholders, or include the same files via your build (e.g. PHP includes or static generator).
- **Clear structure:** `assets/` for all static files, `components/` for shared HTML; pages at root (or under `pages/` with `PAGE_BASE`).
