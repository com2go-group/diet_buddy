# PLD custom work page
Developer: easyDigital · October 2026

## Install
Upload `pld-custom-work-page.zip` in WordPress → Plugins → Add New → Upload, then activate.
Go to Settings → Permalinks and click Save once if `/project/...` URLs 404.

## 1. Projects (admin: PLD Works → All projects / Add project)
Create, edit, trash and delete projects with the normal WordPress screens.
The **Project page components** box builds the page: add, drag/reorder (or ↑ ↓), and remove components:
Hero · Project info · Text · Full image · Image + text · Gallery · Video · Quote.
Each component has its own scroll animation (fade up/in, slide left/right, zoom, image wipe reveal);
the hero has a parallax background. **Master photo = the project's featured image.**
Single projects render at `/project/<slug>/` with previous / all works / next navigation
(follows the master page order). Override the template by copying `templates/single-project.php`
to your theme as `single-pld_project.php`. Or embed a project with `[pld_project id="123"]`.

## 2. Master Works page (admin: PLD Works → Master Works page)
Pick projects from the left list, then arrange them in the 3-column preview with drag & drop
or the ← → ↑ ↓ buttons. Save, then click "Create Works page" (or put `[pld_works]` on any page).
The page shows 3 projects per row (2 on tablet, 1 on phone) with master photo and name.
**Lazy loading:** the first batch is rendered by the server; the rest is fetched as you scroll
(REST `/wp-json/pld/v1/works`), images use `loading="lazy"` and fade in. Batch size is configurable.

Note: the layout/animations follow a generic portfolio design; adjust `assets/css/front.css` to match
the reference page exactly.
