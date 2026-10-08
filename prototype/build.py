#!/usr/bin/env python3
"""Builds SAJA MedLR into single self-contained HTML files.

dist/index.html        – standalone page (open directly in a browser)
dist/artifact.html     – same content without the document skeleton (for hosting as a claude.ai Artifact)
"""
import base64, datetime, pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
logo = 'data:image/png;base64,' + base64.b64encode((root / 'assets' / 'saja-logo.png').read_bytes()).decode()
css = (src / 'styles.css').read_text()
js = '\n'.join((src / f).read_text() for f in ['data.js', 'icons.js', 'core.js', 'pages.js', 'admin.js', 'workflows.js', 'main.js']).replace("'__LOGO__'", repr(logo))
stamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
body = f'''<!-- SAJA MedLR build {stamp} -->
<title>SAJA MedLR</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap">
<style>
{css}
</style>
<div id="app"></div>
<div class="toasts" id="toasts" aria-live="polite"></div>
<script>
"use strict";
{js}
</script>
'''
dist = root / 'dist'; dist.mkdir(exist_ok=True)
(dist / 'artifact.html').write_text(body)
(dist / 'index.html').write_text('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + body.replace('<div id="app">', '</head>\n<body>\n<div id="app">', 1) + '</body>\n</html>\n')
print('built', len(body) // 1024, 'KB')
