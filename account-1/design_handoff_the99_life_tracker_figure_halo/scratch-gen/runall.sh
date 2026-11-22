set -e
cd /home/user/work
rm -f out/shots/*
node measure.mjs base specs-board.json > out/log-base.txt 2>&1
OUTJ=out/measure-prop.json node measure.mjs prop specs-board.json > out/log-prop.txt 2>&1
OUTJ=out/measure-var.json node measure.mjs prop specs-var.json > out/log-var.txt 2>&1
for t in base prop; do OUTJ=out/themes-$t.json node measure.mjs $t specs-themes.json >/dev/null 2>&1; done
node motion.mjs prop > /dev/null 2>&1
rm -rf board/art && mkdir -p board/art && python3 prep.py
