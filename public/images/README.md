# Salon images

Drop image files here. They are served at `/images/...` in the app.

## Folders

| Folder | Purpose | Suggested files |
|--------|---------|-----------------|
| `hero/` | Landing page background | `hero.jpg` (1920×1080 or wider) |
| `staff/` | Stylist headshots | `vicky.jpg`, `maria-santos.jpg`, etc. |
| `salon/` | Interior / branding | Optional gallery shots |

## Usage in code

Paths are defined in `lib/images.ts`. After adding a file, update that file if you use a new filename.

Example: place `public/images/hero/hero.jpg` → referenced as `/images/hero/hero.jpg`
