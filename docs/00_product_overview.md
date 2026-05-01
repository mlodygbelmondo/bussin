# Bussin — product overview

## Idea

Bussin to SaaS dla twórców, którzy chcą generować instrumentalną muzykę AI i publikować ją na YouTube z jak najmniejszą liczbą kroków.

User podaje prosty brief:

- styl,
- klimat,
- długość,
- liczba tracków,
- kanał YouTube,
- obraz do video opcjonalnie,
- publish now albo schedule later.

System sam:

- komponuje prompt do Suno,
- generuje tracki,
- pobiera audio,
- generuje metadane YouTube,
- pozwala odsłuchać preview,
- renderuje video,
- uploaduje na YouTube.

## MVP scope

### In scope

- instrumentale only
- user ma własne konto Suno
- user ma własne konto YouTube
- wiele kanałów YouTube
- osobny film per track
- statyczny obraz do video
- fallback cover
- preview before upload
- approve/reject
- scheduling
- dashboard
- library
- prompt history
- generate similar
- Stripe subscriptions

### Out of scope

- wokale
- lyrics editor
- long mixes
- animated videos
- playlist automation
- YouTube analytics
- AI thumbnails jako core
- team seats
- Content ID checks

## Activation metric

User jest aktywowany, gdy:

1. połączy Suno,
2. połączy YouTube,
3. wygeneruje track,
4. odsłucha preview,
5. zaakceptuje track,
6. opublikuje pierwszy film.
