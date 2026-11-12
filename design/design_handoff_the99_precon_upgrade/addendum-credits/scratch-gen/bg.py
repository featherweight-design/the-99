import kit, up as U, up2 as V
from kit import doc, frame, frames
ph = kit.phone(U.page(False, V.entry().replace(" new9","").replace(" pulse","")), "Decks", h=844, over=U.DOCK)
dk = kit.desk(U.page(True, V.entry().replace(" new9","").replace(" pulse","")), "Decks", h=860)
open("out/bg.dc.html","w").write(doc("bg", frames(frame("p", ph), frame("d", dk)), 1900))
