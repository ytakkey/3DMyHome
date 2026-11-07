# dark.json を、見える点の数×面積の順に短く並べる：python darklist.py <dark.json> [件数]
import sys, json
d = json.load(open(sys.argv[1], encoding='utf-8')); n = int(sys.argv[2]) if len(sys.argv) > 2 else 60
d.sort(key=lambda e: -(min(e['area_cm2'], 2000) * e['vis']))
for e in d[:n]:
    print('%-14s %-16s p%-6d %8.1fcm2 vis%3d ratio %.3f own %8.2f ref %8.2f pos %s n %s' % (e['atlas'], e['obj'], e['poly'], e['area_cm2'], e['vis'], e['ratio'], e['own'], e['ref'], e['pos'], e['nrm']))
