"""onnxruntime 1.19 refuses HanClinto's fastweb-single 1.39 ("two nodes with same node name"). Node
NAMES are labels only, so this writes a copy with duplicates suffixed; no weight or edge changes.
onnxruntime-web 1.27 loads the original file as published (checked in the Node parity run)."""
import collections

import onnx

from common import WEIGHTS

src = WEIGHTS / "hc_det" / "fastweb-single-1.39.onnx"
m = onnx.load(str(src))
seen = collections.Counter()
for n in m.graph.node:
    seen[n.name] += 1
    if seen[n.name] > 1:
        n.name = f"{n.name}_dup{seen[n.name]}"
onnx.save(m, str(src.with_name("fastweb-single-1.39.renamed.onnx")))
print("renamed", sum(c - 1 for c in seen.values() if c > 1), "duplicate node names")
