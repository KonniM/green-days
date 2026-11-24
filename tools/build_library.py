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
# --- Kurzfassungen, 10-Sekunden-Clips, Ziele, Benchmarks ---
ones = load('skills_min.json', {})
for x in lib['skills']:
    if ones.get(x['id']):
        x['one_de'] = ones[x['id']]
clips = load('clips.json', {})
def yt(u):
    import re
    m = re.search(r'(?:v=|youtu\.be/|embed/|shorts/)([\w-]{11})', u or '')
    return m.group(1) if m else None
for k in ('skills', 'mobility', 'exercises'):
    for x in lib[k]:
        c = clips.get(x['id'])
        if not c:
            continue
        if c.get('replaced') and c.get('video'):
            x['video'] = {'url': 'https://www.youtube.com/watch?v=' + c['video'], 'title': c.get('title') or '', 'channel': c.get('channel') or ''}
        if c.get('start_s') is not None and c.get('end_s') is not None and c.get('confidence') in ('high', 'medium'):
            x['clip'] = {'v': c['video'], 's': int(c['start_s']), 'e': int(c['end_s'])}
goals = load('goals.json', {})
lib['goals'] = []
for g in goals.get('goals', []):
    g = dict(g)
    for st in g.get('steps', []):
        v = st.get('video') or {}
        vid = yt(v.get('url'))
        if vid and v.get('start_s') is not None and v.get('end_s') is not None:
            st['clip'] = {'v': vid, 's': int(v['start_s']), 'e': int(v['end_s'])}
    lib['goals'].append(g)
bench = goals.get('benchmarks', {})
lib['bench'] = {}
for k in ('finger', 'pull'):
    b = bench.get(k) or {}
    lib['bench'][k] = {'pts': [[r['v'], r['value']] for r in b.get('by_grade', []) if r.get('value') is not None], 'test_de': b.get('test_de'), 'caveats_de': b.get('caveats_de'), 'sources': b.get('sources', [])}
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
print('Clips:', {k: sum(1 for x in lib[k] if x.get('clip')) for k in ('skills', 'mobility')}, 'Ziel-Clips:', sum(1 for g in lib['goals'] for st in g.get('steps', []) if st.get('clip')))
print('mit Video:', {k: sum(1 for x in lib[k] if x.get('video')) for k in ('exercises', 'skills', 'mobility', 'assessments')})
