#!/usr/bin/env python3
"""Baut js/library.js aus den Recherche-Daten in data/ (fehlende Dateien = leere Listen)."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(name, default):
    p = os.path.join(ROOT, 'data', name)
    if not os.path.exists(p):
        return default
    with open(p, encoding='utf-8') as f:
        return json.load(f)
strength = load('research_strength.json', {})
technique = load('research_technique.json', {})
mobility = load('research_mobility.json', {})
principles = load('principles.json', [])
def tagged(items, tag):
    out = []
    for p in items or []:
        q = dict(p); q.setdefault('tag', tag); out.append(q)
    return out
def clean_video(x):
    v = x.get('video')
    if not v or not isinstance(v, dict) or not v.get('url'):
        x['video'] = None
    return x
lib = {
    'exercises': [clean_video(x) for x in strength.get('exercises', [])],
    'skills': [clean_video(x) for x in technique.get('skills', [])],
    'mobility': [clean_video(x) for x in mobility.get('exercises', [])],
    'routines': mobility.get('routines', []),
    'assessments': [clean_video(x) for x in mobility.get('assessments', [])],
    'principles': principles + tagged(technique.get('frameworks'), 'Technik-Praxis') + tagged(strength.get('principles'), 'Kraft & Energiesysteme') + tagged(mobility.get('principles'), 'Mobility'),
}
ids = {}
for k in ('exercises', 'skills', 'mobility'):
    for x in lib[k]:
        if x['id'] in ids:
            x['id'] = k[:3] + '-' + x['id']
        ids[x['id']] = k
with open(os.path.join(ROOT, 'js', 'library.js'), 'w', encoding='utf-8') as f:
    f.write('/* Generiert von tools/build_library.py – nicht von Hand bearbeiten. */\nwindow.LIB = ')
    json.dump(lib, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print({k: len(v) for k, v in lib.items()})
print('mit Video:', {k: sum(1 for x in lib[k] if x.get('video')) for k in ('exercises', 'skills', 'mobility', 'assessments')})
