set -e
python3 build.py local
for f in out/*.dc.html; do sed -i 's|<script src="./support.js"></script>||' $f; done
python3 render.py "$@"
