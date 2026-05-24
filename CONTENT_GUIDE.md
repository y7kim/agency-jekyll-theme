# Руководство по обновлению сайта

Этот репозиторий работает как личный технический архив: logs, notes, tools, systems, research и writeups.

## 1. Публикация нового log

Обычные посты находятся в `_posts/`.

1. Создай файл в таком формате:

```text
YYYY-MM-DD-title-of-post.md
```

2. Используй такую шапку:

```yaml
---
title: "Название статьи"
excerpt: "Короткое описание для списков и SEO."
tags:
  - linux
  - reversing
---
```

3. Пиши содержание в Markdown ниже front matter.

Пример:

```text
_posts/2026-05-18-analyzing-an-elf-binary.md
```

Главная автоматически берет последние посты из `site.posts`.

## 2. Рекомендуемые типы контента

- `writeup`
- `note`
- `linux`
- `reversing`
- `systems`
- `math`
- `tooling`
- `ctf`

Держи заголовки прямыми и техническими. Сайт должен читаться как лабораторный архив, а не как landing page.

## 3. Добавление постоянных страниц

Обычные страницы находятся в `_pages/`.

Пример:

```yaml
---
permalink: /notes/
title: "Заметки"
excerpt: "Короткие технические заметки."
---
```

Если страница должна появиться в верхней навигации, добавь ссылку в `_data/navigation.yml`.

## 4. Добавление writeups или серий

Текущие коллекции:

- `_htb/` для Hack The Box
- `_otw/` для OverTheWire
- `_mbe/` для Modern Binary Exploitation
- `_dvwa/` для DVWA, если в эту коллекцию будут добавлены файлы

Для каждой коллекции уже есть правила в `_config.yml`, поэтому достаточно создать новые Markdown-файлы в нужной папке и связать их через `_data/navigation.yml`, если это нужно.

## 5. Основные файлы дизайна

- Minimal home: `index.html`
- CSS главной: `css/main.css`
- Глобальный skin темы: `_sass/minimal-mistakes/skins/_h4ckxel.scss`
- Глобальные визуальные настройки: `_sass/custom/_h4ckxel.scss`
- Главная точка входа стилей темы: `assets/css/main.scss`

Главная не загружает JavaScript старой dashboard-системы.

## 6. Рекомендуемый рабочий процесс

```bash
bundle install
bundle exec jekyll serve
```

После этого открой `http://localhost:4000` и проверь:

1. главную,
2. `/writeups/`,
3. `/projects/`,
4. `/notes/`,
5. один пост,
6. одну коллекцию, например HTB, MBE или OTW.
