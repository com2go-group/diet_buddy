# PLD custom work page
Developer: easyDigital · October 2026

## Install
Upload `pld-custom-work-page.zip` in WordPress → Plugins → Add New → Upload, then activate.
Go to Settings → Permalinks and click Save once if `/project/...` URLs 404.

## 1. Projects (admin: PLD Works → All projects / Add project)
Create, edit, trash and delete projects with the normal WordPress screens.
The **Project page components** box builds the page (add, drag or ↑ ↓ to reorder, remove). Components mirror the
reference sample project:
- **Hero slideshow** – full-height background, several images cross-fade (500 ms, loops, seconds per slide configurable).
- **Text + image (2/3 · 1/3)** – title with a bold highlighted word, paragraphs with bold labels (Scope of work, Design concept…),
  portrait image on the right (or left). Title / text / image each have their own animation.
- **Image row** – 3 (or 1–4) images per row, each animating in.
- Also: Text, Full image, Video, Quote, Spacer.
Animations (Elementor-style, 1.25 s, triggered on scroll): Fade in up/right/left, Slide in up/right/left, Fade in, Zoom in.
**Master photo = the project's featured image.**
Single projects render at `/project/<slug>/` with previous / all works / next navigation
(follows the master page order). Override the template by copying `templates/single-project.php`
to your theme as `single-pld_project.php`. Or embed a project with `[pld_project id="123"]`.

## 2. Master Works page (admin: PLD Works → Master Works page)
Pick projects from the left list, then arrange them in the 3-column preview with drag & drop
or the ← → ↑ ↓ buttons. Save, then click "Create Works page" (or put `[pld_works]` on any page).
The page shows 3 projects per row (2 on tablet, 1 on phone) with master photo and name.
**Lazy loading:** the first batch is rendered by the server; the rest is fetched as you scroll
(REST `/wp-json/pld/v1/works`), images use `loading="lazy"` and fade in. Batch size is configurable.

Fonts, colours and header/footer come from your theme (the reference site uses Astra + Garet Book).
