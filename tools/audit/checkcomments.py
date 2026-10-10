# 行の途中のコメント（「   // 日本語…」の後ろに処理が続いている行）を探す。このコードはコメントを行末にだけ書く決まりなので、コメントの後ろに「;」や「)」で終わる処理の続きがあれば疑わしい
import re,sys,pathlib
JP=re.compile(r'[぀-ヿ一-鿿]')
CODE=re.compile(r'[A-Za-z_$][\w$]*\s*(\(|\.|=)')
bad=0
for f in sys.argv[1:]:
    for n,l in enumerate(pathlib.Path(f).read_text(encoding='utf-8').split('\n'),1):
        i=l.find('   // ')
        while i>=0:
            rest=l[i+6:]
            m=JP.search(rest)
            if m:
                # コメントの日本語の後ろに、処理らしき並び（名前の後に ( . = ）と「;」があれば疑わしい
                tail=rest[m.start():]
                cut=tail.find('）') if '）' in tail else -1
                after=tail[cut+1:] if cut>=0 else ''
                if CODE.search(after) and ';' in after:
                    print(f'{f}:{n}: ...{after[:100]}');bad+=1
                break
            i=l.find('   // ',i+1)
print('suspicious',bad)
