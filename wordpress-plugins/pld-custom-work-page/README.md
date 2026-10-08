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

## Header / footer (v1.1)
Project pages use the same full-width layout and the same Elementor header & footer templates as your normal pages
(Astra + Header Footer Elementor). If your header/footer template isn't picked automatically, force one with
`add_filter('pld_header_template_id', fn() => 8);` and `add_filter('pld_footer_template_id', fn() => 28);`
(the numbers are the IDs of the header/footer posts under Appearance → Elementor Header & Footer Builder).

## v1.2
- Text boxes (Text + image, Text, Quote) now have the WordPress editor toolbar (Visual / Text tabs, bold, italic, lists, links…); title fields have B / I buttons.
- Look & feel matched to the sample: banner hero (default 25% of page width, other heights selectable), small title with heavy first word, brown text with bold labels, wide paragraph spacing, 27px side gutters and wider gaps in image rows. Text / label colours can be changed under PLD Works → Master Works page.

## v1.3
- Project pages now print the Elementor header & footer templates themselves (same page skeleton as your Elementor pages), no longer relying on how the theme prints its header. Pick the templates under PLD Works → Master Works page → "Project page header / footer" (Automatic = same as the site).
- Text editor: the WordPress editor toolbar is initialised reliably; if it cannot start, a built-in B / I / Link / List / Paragraph bar is shown instead.

## v1.4
- Fonts follow the site (Garet Book 400 / Garet Heavy 700 as the bold weight, 14px base text, 22px title); text and title sizes editable under Master Works page → "Project page text colours".
- Header/footer: project pages now carry the Elementor kit body class (`elementor-kit-N`) and load Header Footer Elementor's menu/icon CSS and JS themselves, so the menu looks identical to the site's own pages. The site's overlay behaviour (transparent header on top of the hero) is applied too.
- Spacing measured from the sample: 72px between paragraphs, 76px under the title, 26px gutters, 34px gaps in image rows, 80px between sections.

## v1.5
- Works page: optional hero image / fading slideshow above the projects (set under Master Works page → "Works page hero image").
- Master project cards are 350 × 500 (portrait, cropped from the featured image, image size `pld-card`). Existing images need their sizes regenerated once (e.g. the "Regenerate Thumbnails" plugin); until then the full image is used, cropped by CSS to the same shape.

## v1.6
- Works page: the "Works" heading is printed by the plugin below the hero image (the theme's title above it is hidden).
- Project pages get the site's header/footer through Header Footer Elementor's own filters (`get_hfe_header_id` / `hfe_header_enabled` and the footer equivalents), so they use exactly the same markup, CSS and JS as your other pages. Set "Automatic" to apply the site's template to projects, or pick a template explicitly under Master Works page → "Project page header / footer".

## v1.7
- Project page: the hero starts 100px lower.
- Body text is 50 % bigger (14px → 21px, still editable under Master Works page); paragraph gaps scale with it. The title size is unchanged (22px).

## v1.8
- Text size is now printed inline with `!important` (cannot be overridden by theme/Elementor typography or a cached stylesheet): body text 21px, title 33px (both +50 %). Adjust under Master Works page → "Project page text colours".

## v2.1.1
- Master Works page: optional spacer above the hero image (None / 20 / 30 / 40 / 60 / 80 / 100 / 150 / 200 px), set in the "Works page hero image" box.
- Project page Spacer component: new 20px and 30px options.

## v2.2.0
- Master Works page now shows **5 rows × 3 columns (15 projects) per page** with **Previous (bottom left)** and **Next (bottom right)** buttons; paging happens without a reload and the URL gets `?works_page=N` (plain links work without JavaScript). Rows per page is adjustable.
- **Project image height** is adjustable (200–1000px, width stays 350) under Master Works page → "Works grid".
- **Project images animate on scroll** (fade up / slide in from right / zoom in / reveal, staggered per column; or none), chosen in the same box. Images still use native lazy loading.

## v2.2.1
- Master Works page → Works grid: new **Project image width** (200–600px, default 350) next to the height. Widths above 350px use the "large" image size so photos stay sharp.

## v2.2.2
- Works grid sizing fix: the grid now takes the full width of the page content (it could shrink inside Astra's flex container), and project images are positioned inside their box with `object-fit: cover` so theme image rules (`height:auto`, `max-width`) can't change the size.

## v2.3.0
- Works grid now keeps your exact image size: width/height up to 2000px (any value 100–2000), the grid breaks out of the theme's content width (like the hero) so columns are no longer squeezed, and a new **Columns** option (1–4; use 1 for wide images such as 1000 × 500) sits next to Rows per page. On small screens the cards still shrink to fit (2 columns on tablets, 1 on phones).

## v2.3.1
- Project page: the bottom navigation (Previous project · All works · Next project) is now a full-width bar of three brown buttons with white lettering, the same style as the Works page Next / Previous buttons (stacked on phones).

## v2.3.2
- (v2.3.2 was published without this change; it is included from v2.3.3.)

## v2.3.3
- A 75px full-width spacer in the same brown as the navigation buttons now sits at the bottom of both the project pages (below the navigation bar) and the Works page (below the grid and Next / Previous buttons).

## v2.3.4
- Works page: the brown spacer is removed; the site footer now has the same brown background (and sits in the page flow instead of overlaying the first screen). Project pages keep their 75px brown band.

## v2.3.5
- Project page: bold text (labels such as "Scope of work", the bold word in the title) is set in Roboto 700. Roboto is loaded from Google Fonts on project pages (the site already loads it for the menu).

## v2.3.6
- Project text is 20px (was 21px). Applied once on update; you can still change it under Master Works page → "Text size".

## v2.3.7
- Project page → "Text + image" component: new **Text vertical alignment** (Top / Middle / Bottom) to place the text beside the image. Existing projects keep Top.

## v2.3.8
- Project text boxes use line breaks instead of paragraphs: pressing Enter in the editor inserts `<br>` (not `<p>`), and existing text is converted on output (`</p><p>` → `<br>`, empty paragraphs → blank lines, new lines typed in the Text tab → `<br>`). Lists and quotes keep their own structure.
