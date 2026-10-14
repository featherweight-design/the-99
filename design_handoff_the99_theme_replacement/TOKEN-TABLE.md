# Six-column token table — The 99 theme system

`design/design_handoff_the99_theme_replacement/` · **R6** · 2026-09-06

**R6 supersedes R5.** R5's two new palettes failed `src/lib/theme/contract.test.ts` — Canopy on 2
gates, Witching Hour on 15. **The palettes were changed to fit the contract; the contract was not
touched.** Rationale in `README.md` decision 7.

- **35 keys per theme** — 16 chrome · 6 accent · 3 semantic · 5 availability · 5 WUBRG.
- **Amonkhet is `:root`**; the other five are `[data-theme="…"]` blocks.
- `--avail-soft` / `--avail-hard` are **`var()` aliases, not literals.**
- **`--b` corrected to `#98748F` in all six columns.** R5 carried `#1E1B1A`, which is what R1
  documented; the shipped code has always used `#98748F`. The near-black measured **1.02:1** on
  Witching Hour's surface — invisible. R1 was wrong and R5 inherited it.
- **`--font-display-face` is not in this table** and is not one of the 35 keys. The two new
  themes need it declared — Trirong 600 and Cormorant Garamond 600 — wherever the shipped four
  declare theirs.

| Token | Family | Low Sun<br/>`:root` | Neon Rain<br/>`kamigawa` | Oil Haze<br/>`phyrexia` | First Frost<br/>`kaldheim` | Canopy<br/>`ixalan` | Witching Hour<br/>`eldraine` |
|---|---|---|---|---|---|---|---|
| `--bg` | Chrome | `#14110E` <img src="https://placehold.co/14x14/14110E/14110E.png" width="14" height="14"/> | `#0E0F14` <img src="https://placehold.co/14x14/0E0F14/0E0F14.png" width="14" height="14"/> | `#0D0B0E` <img src="https://placehold.co/14x14/0D0B0E/0D0B0E.png" width="14" height="14"/> | `#121217` <img src="https://placehold.co/14x14/121217/121217.png" width="14" height="14"/> | `#0E1310` <img src="https://placehold.co/14x14/0E1310/0E1310.png" width="14" height="14"/> | `#120E17` <img src="https://placehold.co/14x14/120E17/120E17.png" width="14" height="14"/> |
| `--surface` | Chrome | `#1E1A15` <img src="https://placehold.co/14x14/1E1A15/1E1A15.png" width="14" height="14"/> | `#16181F` <img src="https://placehold.co/14x14/16181F/16181F.png" width="14" height="14"/> | `#151317` <img src="https://placehold.co/14x14/151317/151317.png" width="14" height="14"/> | `#1E1F26` <img src="https://placehold.co/14x14/1E1F26/1E1F26.png" width="14" height="14"/> | `#171E19` <img src="https://placehold.co/14x14/171E19/171E19.png" width="14" height="14"/> | `#1B1821` <img src="https://placehold.co/14x14/1B1821/1B1821.png" width="14" height="14"/> |
| `--surface-raised` | Chrome | `#211D18` <img src="https://placehold.co/14x14/211D18/211D18.png" width="14" height="14"/> | `#191B22` <img src="https://placehold.co/14x14/191B22/191B22.png" width="14" height="14"/> | `#18161A` <img src="https://placehold.co/14x14/18161A/18161A.png" width="14" height="14"/> | `#22232B` <img src="https://placehold.co/14x14/22232B/22232B.png" width="14" height="14"/> | `#1A221C` <img src="https://placehold.co/14x14/1A221C/1A221C.png" width="14" height="14"/> | `#1F1C25` <img src="https://placehold.co/14x14/1F1C25/1F1C25.png" width="14" height="14"/> |
| `--surface-rail` | Chrome | `#1A1611` <img src="https://placehold.co/14x14/1A1611/1A1611.png" width="14" height="14"/> | `#12141B` <img src="https://placehold.co/14x14/12141B/12141B.png" width="14" height="14"/> | `#110F13` <img src="https://placehold.co/14x14/110F13/110F13.png" width="14" height="14"/> | `#181920` <img src="https://placehold.co/14x14/181920/181920.png" width="14" height="14"/> | `#121814` <img src="https://placehold.co/14x14/121814/121814.png" width="14" height="14"/> | `#15121B` <img src="https://placehold.co/14x14/15121B/15121B.png" width="14" height="14"/> |
| `--surface-sunken` | Chrome | `#18140F` <img src="https://placehold.co/14x14/18140F/18140F.png" width="14" height="14"/> | `#101219` <img src="https://placehold.co/14x14/101219/101219.png" width="14" height="14"/> | `#100E12` <img src="https://placehold.co/14x14/100E12/100E12.png" width="14" height="14"/> | `#16171D` <img src="https://placehold.co/14x14/16171D/16171D.png" width="14" height="14"/> | `#101512` <img src="https://placehold.co/14x14/101512/101512.png" width="14" height="14"/> | `#131018` <img src="https://placehold.co/14x14/131018/131018.png" width="14" height="14"/> |
| `--surface-inset` | Chrome | `#1B1712` <img src="https://placehold.co/14x14/1B1712/1B1712.png" width="14" height="14"/> | `#13151C` <img src="https://placehold.co/14x14/13151C/13151C.png" width="14" height="14"/> | `#131115` <img src="https://placehold.co/14x14/131115/131115.png" width="14" height="14"/> | `#1A1B22` <img src="https://placehold.co/14x14/1A1B22/1A1B22.png" width="14" height="14"/> | `#141B16` <img src="https://placehold.co/14x14/141B16/141B16.png" width="14" height="14"/> | `#17141D` <img src="https://placehold.co/14x14/17141D/17141D.png" width="14" height="14"/> |
| `--elevated` | Chrome | `#29241F` <img src="https://placehold.co/14x14/29241F/29241F.png" width="14" height="14"/> | `#20222A` <img src="https://placehold.co/14x14/20222A/20222A.png" width="14" height="14"/> | `#1E1C20` <img src="https://placehold.co/14x14/1E1C20/1E1C20.png" width="14" height="14"/> | `#2D2E35` <img src="https://placehold.co/14x14/2D2E35/2D2E35.png" width="14" height="14"/> | `#212A23` <img src="https://placehold.co/14x14/212A23/212A23.png" width="14" height="14"/> | `#26232C` <img src="https://placehold.co/14x14/26232C/26232C.png" width="14" height="14"/> |
| `--elevated-hover` | Chrome | `#201C17` <img src="https://placehold.co/14x14/201C17/201C17.png" width="14" height="14"/> | `#181A21` <img src="https://placehold.co/14x14/181A21/181A21.png" width="14" height="14"/> | `#171519` <img src="https://placehold.co/14x14/171519/171519.png" width="14" height="14"/> | `#212229` <img src="https://placehold.co/14x14/212229/212229.png" width="14" height="14"/> | `#18201A` <img src="https://placehold.co/14x14/18201A/18201A.png" width="14" height="14"/> | `#1D1A23` <img src="https://placehold.co/14x14/1D1A23/1D1A23.png" width="14" height="14"/> |
| `--border` | Chrome | `#2B241B` <img src="https://placehold.co/14x14/2B241B/2B241B.png" width="14" height="14"/> | `#181C26` <img src="https://placehold.co/14x14/181C26/181C26.png" width="14" height="14"/> | `#19161C` <img src="https://placehold.co/14x14/19161C/19161C.png" width="14" height="14"/> | `#1A1F2B` <img src="https://placehold.co/14x14/1A1F2B/1A1F2B.png" width="14" height="14"/> | `#1D2620` <img src="https://placehold.co/14x14/1D2620/1D2620.png" width="14" height="14"/> | `#241D30` <img src="https://placehold.co/14x14/241D30/241D30.png" width="14" height="14"/> |
| `--border-strong` | Chrome | `#3A3229` <img src="https://placehold.co/14x14/3A3229/3A3229.png" width="14" height="14"/> | `#262A35` <img src="https://placehold.co/14x14/262A35/262A35.png" width="14" height="14"/> | `#262329` <img src="https://placehold.co/14x14/262329/262329.png" width="14" height="14"/> | `#2E3340` <img src="https://placehold.co/14x14/2E3340/2E3340.png" width="14" height="14"/> | `#2C3830` <img src="https://placehold.co/14x14/2C3830/2C3830.png" width="14" height="14"/> | `#342C41` <img src="https://placehold.co/14x14/342C41/342C41.png" width="14" height="14"/> |
| `--border-dashed` | Chrome | `#494037` <img src="https://placehold.co/14x14/494037/494037.png" width="14" height="14"/> | `#343843` <img src="https://placehold.co/14x14/343843/343843.png" width="14" height="14"/> | `#332F36` <img src="https://placehold.co/14x14/332F36/332F36.png" width="14" height="14"/> | `#424755` <img src="https://placehold.co/14x14/424755/424755.png" width="14" height="14"/> | `#3B4A3F` <img src="https://placehold.co/14x14/3B4A3F/3B4A3F.png" width="14" height="14"/> | `#443C52` <img src="https://placehold.co/14x14/443C52/443C52.png" width="14" height="14"/> |
| `--fg` | Chrome | `#EDE6D8` <img src="https://placehold.co/14x14/EDE6D8/EDE6D8.png" width="14" height="14"/> | `#E6E8F0` <img src="https://placehold.co/14x14/E6E8F0/E6E8F0.png" width="14" height="14"/> | `#E4E2E6` <img src="https://placehold.co/14x14/E4E2E6/E4E2E6.png" width="14" height="14"/> | `#C6D2D3` <img src="https://placehold.co/14x14/C6D2D3/C6D2D3.png" width="14" height="14"/> | `#E0E7DE` <img src="https://placehold.co/14x14/E0E7DE/E0E7DE.png" width="14" height="14"/> | `#E4DEEE` <img src="https://placehold.co/14x14/E4DEEE/E4DEEE.png" width="14" height="14"/> |
| `--fg-body` | Chrome | `#C0B8A6` <img src="https://placehold.co/14x14/C0B8A6/C0B8A6.png" width="14" height="14"/> | `#B1B6C7` <img src="https://placehold.co/14x14/B1B6C7/B1B6C7.png" width="14" height="14"/> | `#B5B2BB` <img src="https://placehold.co/14x14/B5B2BB/B5B2BB.png" width="14" height="14"/> | `#B3C0C2` <img src="https://placehold.co/14x14/B3C0C2/B3C0C2.png" width="14" height="14"/> | `#B6C2B3` <img src="https://placehold.co/14x14/B6C2B3/B6C2B3.png" width="14" height="14"/> | `#B9B2C5` <img src="https://placehold.co/14x14/B9B2C5/B9B2C5.png" width="14" height="14"/> |
| `--fg-muted` | Chrome | `#A59C89` <img src="https://placehold.co/14x14/A59C89/A59C89.png" width="14" height="14"/> | `#959AAD` <img src="https://placehold.co/14x14/959AAD/959AAD.png" width="14" height="14"/> | `#9A96A0` <img src="https://placehold.co/14x14/9A96A0/9A96A0.png" width="14" height="14"/> | `#95A4A6` <img src="https://placehold.co/14x14/95A4A6/95A4A6.png" width="14" height="14"/> | `#98A695` <img src="https://placehold.co/14x14/98A695/98A695.png" width="14" height="14"/> | `#9C95A8` <img src="https://placehold.co/14x14/9C95A8/9C95A8.png" width="14" height="14"/> |
| `--fg-faint` | Chrome | `#8B8270` <img src="https://placehold.co/14x14/8B8270/8B8270.png" width="14" height="14"/> | `#6F7486` <img src="https://placehold.co/14x14/6F7486/6F7486.png" width="14" height="14"/> | `#78747E` <img src="https://placehold.co/14x14/78747E/78747E.png" width="14" height="14"/> | `#7C8A8C` <img src="https://placehold.co/14x14/7C8A8C/7C8A8C.png" width="14" height="14"/> | `#808C7C` <img src="https://placehold.co/14x14/808C7C/808C7C.png" width="14" height="14"/> | `#898395` <img src="https://placehold.co/14x14/898395/898395.png" width="14" height="14"/> |
| `--fg-locked` | Chrome | `#6E6654` <img src="https://placehold.co/14x14/6E6654/6E6654.png" width="14" height="14"/> | `#606476` <img src="https://placehold.co/14x14/606476/606476.png" width="14" height="14"/> | `#64616A` <img src="https://placehold.co/14x14/64616A/64616A.png" width="14" height="14"/> | `#5F6D6E` <img src="https://placehold.co/14x14/5F6D6E/5F6D6E.png" width="14" height="14"/> | `#626E5E` <img src="https://placehold.co/14x14/626E5E/626E5E.png" width="14" height="14"/> | `#6A6475` <img src="https://placehold.co/14x14/6A6475/6A6475.png" width="14" height="14"/> |
| `--accent` | Accent | `#CF8745` <img src="https://placehold.co/14x14/CF8745/CF8745.png" width="14" height="14"/> | `#FF4D9A` <img src="https://placehold.co/14x14/FF4D9A/FF4D9A.png" width="14" height="14"/> | `#52827A` <img src="https://placehold.co/14x14/52827A/52827A.png" width="14" height="14"/> | `#5C86C9` <img src="https://placehold.co/14x14/5C86C9/5C86C9.png" width="14" height="14"/> | `#A3C445` <img src="https://placehold.co/14x14/A3C445/A3C445.png" width="14" height="14"/> | `#AE88E6` <img src="https://placehold.co/14x14/AE88E6/AE88E6.png" width="14" height="14"/> |
| `--accent-hover` | Accent | `#DE9757` <img src="https://placehold.co/14x14/DE9757/DE9757.png" width="14" height="14"/> | `#FF62A9` <img src="https://placehold.co/14x14/FF62A9/FF62A9.png" width="14" height="14"/> | `#629189` <img src="https://placehold.co/14x14/629189/629189.png" width="14" height="14"/> | `#6C95D8` <img src="https://placehold.co/14x14/6C95D8/6C95D8.png" width="14" height="14"/> | `#B2D257` <img src="https://placehold.co/14x14/B2D257/B2D257.png" width="14" height="14"/> | `#BC9BEE` <img src="https://placehold.co/14x14/BC9BEE/BC9BEE.png" width="14" height="14"/> |
| `--accent-strong` | Accent | `#AB6E37` <img src="https://placehold.co/14x14/AB6E37/AB6E37.png" width="14" height="14"/> | `#D33E7E` <img src="https://placehold.co/14x14/D33E7E/D33E7E.png" width="14" height="14"/> | `#3E665F` <img src="https://placehold.co/14x14/3E665F/3E665F.png" width="14" height="14"/> | `#486BA3` <img src="https://placehold.co/14x14/486BA3/486BA3.png" width="14" height="14"/> | `#85A22F` <img src="https://placehold.co/14x14/85A22F/85A22F.png" width="14" height="14"/> | `#8E6AC4` <img src="https://placehold.co/14x14/8E6AC4/8E6AC4.png" width="14" height="14"/> |
| `--accent-shadow` | Accent | `#6B482A` <img src="https://placehold.co/14x14/6B482A/6B482A.png" width="14" height="14"/> | `#843052` <img src="https://placehold.co/14x14/843052/843052.png" width="14" height="14"/> | `#213834` <img src="https://placehold.co/14x14/213834/213834.png" width="14" height="14"/> | `#2C405F` <img src="https://placehold.co/14x14/2C405F/2C405F.png" width="14" height="14"/> | `#3E5220` <img src="https://placehold.co/14x14/3E5220/3E5220.png" width="14" height="14"/> | `#4A3568` <img src="https://placehold.co/14x14/4A3568/4A3568.png" width="14" height="14"/> |
| `--accent-dim` | Accent | `#6B482A` <img src="https://placehold.co/14x14/6B482A/6B482A.png" width="14" height="14"/> | `#843052` <img src="https://placehold.co/14x14/843052/843052.png" width="14" height="14"/> | `#213834` <img src="https://placehold.co/14x14/213834/213834.png" width="14" height="14"/> | `#2C405F` <img src="https://placehold.co/14x14/2C405F/2C405F.png" width="14" height="14"/> | `#3E5220` <img src="https://placehold.co/14x14/3E5220/3E5220.png" width="14" height="14"/> | `#4A3568` <img src="https://placehold.co/14x14/4A3568/4A3568.png" width="14" height="14"/> |
| `--accent-mid` | Accent | `#AB6E37` <img src="https://placehold.co/14x14/AB6E37/AB6E37.png" width="14" height="14"/> | `#D33E7E` <img src="https://placehold.co/14x14/D33E7E/D33E7E.png" width="14" height="14"/> | `#3E665F` <img src="https://placehold.co/14x14/3E665F/3E665F.png" width="14" height="14"/> | `#486BA3` <img src="https://placehold.co/14x14/486BA3/486BA3.png" width="14" height="14"/> | `#85A22F` <img src="https://placehold.co/14x14/85A22F/85A22F.png" width="14" height="14"/> | `#8E6AC4` <img src="https://placehold.co/14x14/8E6AC4/8E6AC4.png" width="14" height="14"/> |
| `--success` | Semantic | `#6FA368` <img src="https://placehold.co/14x14/6FA368/6FA368.png" width="14" height="14"/> | `#6FA368` <img src="https://placehold.co/14x14/6FA368/6FA368.png" width="14" height="14"/> | `#6FA368` <img src="https://placehold.co/14x14/6FA368/6FA368.png" width="14" height="14"/> | `#6FA368` <img src="https://placehold.co/14x14/6FA368/6FA368.png" width="14" height="14"/> | `#6FA368` <img src="https://placehold.co/14x14/6FA368/6FA368.png" width="14" height="14"/> | `#6FA368` <img src="https://placehold.co/14x14/6FA368/6FA368.png" width="14" height="14"/> |
| `--warning` | Semantic | `#DEAA29` <img src="https://placehold.co/14x14/DEAA29/DEAA29.png" width="14" height="14"/> | `#E0913C` <img src="https://placehold.co/14x14/E0913C/E0913C.png" width="14" height="14"/> | `#E0913C` <img src="https://placehold.co/14x14/E0913C/E0913C.png" width="14" height="14"/> | `#E0913C` <img src="https://placehold.co/14x14/E0913C/E0913C.png" width="14" height="14"/> | `#E0913C` <img src="https://placehold.co/14x14/E0913C/E0913C.png" width="14" height="14"/> | `#E0913C` <img src="https://placehold.co/14x14/E0913C/E0913C.png" width="14" height="14"/> |
| `--danger` | Semantic | `#C6533F` <img src="https://placehold.co/14x14/C6533F/C6533F.png" width="14" height="14"/> | `#C6533F` <img src="https://placehold.co/14x14/C6533F/C6533F.png" width="14" height="14"/> | `#C6533F` <img src="https://placehold.co/14x14/C6533F/C6533F.png" width="14" height="14"/> | `#C6533F` <img src="https://placehold.co/14x14/C6533F/C6533F.png" width="14" height="14"/> | `#C6533F` <img src="https://placehold.co/14x14/C6533F/C6533F.png" width="14" height="14"/> | `#C6533F` <img src="https://placehold.co/14x14/C6533F/C6533F.png" width="14" height="14"/> |
| `--avail-soft` | Availability | `var(--fg-muted)` | `var(--fg-muted)` | `var(--fg-muted)` | `var(--fg-muted)` | `var(--fg-muted)` | `var(--fg-muted)` |
| `--avail-hard` | Availability | `var(--accent)` | `var(--accent)` | `var(--accent)` | `var(--accent)` | `var(--accent)` | `var(--accent)` |
| `--avail-hard-fg` | Availability | `#D9975C` <img src="https://placehold.co/14x14/D9975C/D9975C.png" width="14" height="14"/> | `#DF8AA7` <img src="https://placehold.co/14x14/DF8AA7/DF8AA7.png" width="14" height="14"/> | `#77A9A0` <img src="https://placehold.co/14x14/77A9A0/77A9A0.png" width="14" height="14"/> | `#80ABEF` <img src="https://placehold.co/14x14/80ABEF/80ABEF.png" width="14" height="14"/> | `#ABCB5B` <img src="https://placehold.co/14x14/ABCB5B/ABCB5B.png" width="14" height="14"/> | `#B795EA` <img src="https://placehold.co/14x14/B795EA/B795EA.png" width="14" height="14"/> |
| `--avail-over-fg` | Availability | `#C46857` <img src="https://placehold.co/14x14/C46857/C46857.png" width="14" height="14"/> | `#C26755` <img src="https://placehold.co/14x14/C26755/C26755.png" width="14" height="14"/> | `#BE6453` <img src="https://placehold.co/14x14/BE6453/BE6453.png" width="14" height="14"/> | `#C86D5B` <img src="https://placehold.co/14x14/C86D5B/C86D5B.png" width="14" height="14"/> | `#C56A58` <img src="https://placehold.co/14x14/C56A58/C56A58.png" width="14" height="14"/> | `#C56A58` <img src="https://placehold.co/14x14/C56A58/C56A58.png" width="14" height="14"/> |
| `--avail-over-border` | Availability | `#752619` <img src="https://placehold.co/14x14/752619/752619.png" width="14" height="14"/> | `#752619` <img src="https://placehold.co/14x14/752619/752619.png" width="14" height="14"/> | `#752619` <img src="https://placehold.co/14x14/752619/752619.png" width="14" height="14"/> | `#752619` <img src="https://placehold.co/14x14/752619/752619.png" width="14" height="14"/> | `#752619` <img src="https://placehold.co/14x14/752619/752619.png" width="14" height="14"/> | `#752619` <img src="https://placehold.co/14x14/752619/752619.png" width="14" height="14"/> |
| `--w` | WUBRG | `#F4E9C4` <img src="https://placehold.co/14x14/F4E9C4/F4E9C4.png" width="14" height="14"/> | `#F4E9C4` <img src="https://placehold.co/14x14/F4E9C4/F4E9C4.png" width="14" height="14"/> | `#F4E9C4` <img src="https://placehold.co/14x14/F4E9C4/F4E9C4.png" width="14" height="14"/> | `#F4E9C4` <img src="https://placehold.co/14x14/F4E9C4/F4E9C4.png" width="14" height="14"/> | `#F4E9C4` <img src="https://placehold.co/14x14/F4E9C4/F4E9C4.png" width="14" height="14"/> | `#F4E9C4` <img src="https://placehold.co/14x14/F4E9C4/F4E9C4.png" width="14" height="14"/> |
| `--u` | WUBRG | `#3A6AA5` <img src="https://placehold.co/14x14/3A6AA5/3A6AA5.png" width="14" height="14"/> | `#3A6AA5` <img src="https://placehold.co/14x14/3A6AA5/3A6AA5.png" width="14" height="14"/> | `#3A6AA5` <img src="https://placehold.co/14x14/3A6AA5/3A6AA5.png" width="14" height="14"/> | `#3A6AA5` <img src="https://placehold.co/14x14/3A6AA5/3A6AA5.png" width="14" height="14"/> | `#3A6AA5` <img src="https://placehold.co/14x14/3A6AA5/3A6AA5.png" width="14" height="14"/> | `#3A6AA5` <img src="https://placehold.co/14x14/3A6AA5/3A6AA5.png" width="14" height="14"/> |
| `--b` | WUBRG | `#98748F` <img src="https://placehold.co/14x14/98748F/98748F.png" width="14" height="14"/> | `#98748F` <img src="https://placehold.co/14x14/98748F/98748F.png" width="14" height="14"/> | `#98748F` <img src="https://placehold.co/14x14/98748F/98748F.png" width="14" height="14"/> | `#98748F` <img src="https://placehold.co/14x14/98748F/98748F.png" width="14" height="14"/> | `#98748F` <img src="https://placehold.co/14x14/98748F/98748F.png" width="14" height="14"/> | `#98748F` <img src="https://placehold.co/14x14/98748F/98748F.png" width="14" height="14"/> |
| `--r` | WUBRG | `#C05A3E` <img src="https://placehold.co/14x14/C05A3E/C05A3E.png" width="14" height="14"/> | `#C05A3E` <img src="https://placehold.co/14x14/C05A3E/C05A3E.png" width="14" height="14"/> | `#C05A3E` <img src="https://placehold.co/14x14/C05A3E/C05A3E.png" width="14" height="14"/> | `#C05A3E` <img src="https://placehold.co/14x14/C05A3E/C05A3E.png" width="14" height="14"/> | `#C05A3E` <img src="https://placehold.co/14x14/C05A3E/C05A3E.png" width="14" height="14"/> | `#C05A3E` <img src="https://placehold.co/14x14/C05A3E/C05A3E.png" width="14" height="14"/> |
| `--g` | WUBRG | `#4B7A46` <img src="https://placehold.co/14x14/4B7A46/4B7A46.png" width="14" height="14"/> | `#4B7A46` <img src="https://placehold.co/14x14/4B7A46/4B7A46.png" width="14" height="14"/> | `#527030` <img src="https://placehold.co/14x14/527030/527030.png" width="14" height="14"/> | `#4B7A46` <img src="https://placehold.co/14x14/4B7A46/4B7A46.png" width="14" height="14"/> | `#4B7A46` <img src="https://placehold.co/14x14/4B7A46/4B7A46.png" width="14" height="14"/> | `#4B7A46` <img src="https://placehold.co/14x14/4B7A46/4B7A46.png" width="14" height="14"/> |

## What changed from R5

Every changed token keeps its **OKLCH lightness and hue** and moves only in chroma, so the value
structure and the temperature of each ground are exactly as drawn — only the saturation drops.
Accents are **untouched**: they passed every gate and they are the theme's identity.

### Witching Hour `eldraine` — 14 tokens

| Token | R5 | R6 | Chroma |
|---|---|---|---|
| `--bg` | `#120E18` <img src="https://placehold.co/14x14/120E18/120E18.png" width="14" height="14"/> | `#120E17` <img src="https://placehold.co/14x14/120E17/120E17.png" width="14" height="14"/> | 0.0212 → **0.0193** |
| `--surface` | `#1C1626` <img src="https://placehold.co/14x14/1C1626/1C1626.png" width="14" height="14"/> | `#1B1821` <img src="https://placehold.co/14x14/1B1821/1B1821.png" width="14" height="14"/> | 0.0319 → **0.0179** |
| `--surface-raised` | `#201A2B` <img src="https://placehold.co/14x14/201A2B/201A2B.png" width="14" height="14"/> | `#1F1C25` <img src="https://placehold.co/14x14/1F1C25/1F1C25.png" width="14" height="14"/> | 0.0331 → **0.0176** |
| `--surface-rail` | `#16111E` <img src="https://placehold.co/14x14/16111E/16111E.png" width="14" height="14"/> | `#15121B` <img src="https://placehold.co/14x14/15121B/15121B.png" width="14" height="14"/> | 0.0268 → **0.0185** |
| `--surface-sunken` | `#140F1B` <img src="https://placehold.co/14x14/140F1B/140F1B.png" width="14" height="14"/> | `#131018` <img src="https://placehold.co/14x14/131018/131018.png" width="14" height="14"/> | 0.0252 → **0.0168** |
| `--surface-inset` | `#181322` <img src="https://placehold.co/14x14/181322/181322.png" width="14" height="14"/> | `#17141D` <img src="https://placehold.co/14x14/17141D/17141D.png" width="14" height="14"/> | 0.0302 → **0.0183** |
| `--elevated` | `#282034` <img src="https://placehold.co/14x14/282034/282034.png" width="14" height="14"/> | `#26232C` <img src="https://placehold.co/14x14/26232C/26232C.png" width="14" height="14"/> | 0.0382 → **0.0171** |
| `--elevated-hover` | `#1E1829` <img src="https://placehold.co/14x14/1E1829/1E1829.png" width="14" height="14"/> | `#1D1A23` <img src="https://placehold.co/14x14/1D1A23/1D1A23.png" width="14" height="14"/> | 0.0334 → **0.0178** |
| `--fg-body` | `#BAB0CC` <img src="https://placehold.co/14x14/BAB0CC/BAB0CC.png" width="14" height="14"/> | `#B9B2C5` <img src="https://placehold.co/14x14/B9B2C5/B9B2C5.png" width="14" height="14"/> | 0.0408 → **0.0277** |
| `--fg-muted` | `#9E93B0` <img src="https://placehold.co/14x14/9E93B0/9E93B0.png" width="14" height="14"/> | `#9C95A8` <img src="https://placehold.co/14x14/9C95A8/9C95A8.png" width="14" height="14"/> | 0.0438 → **0.0286** |
| `--fg-faint` | `#8B80A0` <img src="https://placehold.co/14x14/8B80A0/8B80A0.png" width="14" height="14"/> | `#898395` <img src="https://placehold.co/14x14/898395/898395.png" width="14" height="14"/> | 0.0491 → **0.0276** |
| `--fg-locked` | `#665C77` <img src="https://placehold.co/14x14/665C77/665C77.png" width="14" height="14"/> | `#6A6475` <img src="https://placehold.co/14x14/6A6475/6A6475.png" width="14" height="14"/> | 0.0440 → **0.0274** |
| `--border-strong` | `#352B45` <img src="https://placehold.co/14x14/352B45/352B45.png" width="14" height="14"/> | `#342C41` <img src="https://placehold.co/14x14/342C41/342C41.png" width="14" height="14"/> | 0.0473 → **0.0384** |
| `--border-dashed` | `#463A59` <img src="https://placehold.co/14x14/463A59/463A59.png" width="14" height="14"/> | `#443C52` <img src="https://placehold.co/14x14/443C52/443C52.png" width="14" height="14"/> | 0.0540 → **0.0384** |

`--fg-locked` also gained lightness: it was **2.82:1** on `--surface` against a 3:1 floor, now
**3.08:1**.

### Canopy `ixalan` — 2 tokens

| Token | R5 | R6 | Chroma |
|---|---|---|---|
| `--fg-faint` | `#7E8D79` <img src="https://placehold.co/14x14/7E8D79/7E8D79.png" width="14" height="14"/> | `#808C7C` <img src="https://placehold.co/14x14/808C7C/808C7C.png" width="14" height="14"/> | 0.0342 → **0.0274** |
| `--fg-locked` | `#616E5D` <img src="https://placehold.co/14x14/616E5D/616E5D.png" width="14" height="14"/> | `#626E5E` <img src="https://placehold.co/14x14/626E5E/626E5E.png" width="14" height="14"/> | 0.0305 → **0.0286** |

## Contract headroom, measured

Caps: surfaces **0.02** · text ramp **0.03** · borders **0.04**.

| Theme | max surface C | max text C | max border C |
|---|---|---|---|
| Canopy | 0.0180 | 0.0290 | 0.0266 |
| Witching Hour | 0.0193 | 0.0286 | 0.0384 |

Both now sit inside every cap with margin, and Witching Hour's most saturated surface
(0.0193) lands just under the most saturated shipped theme's 0.0199 — it is now a
normal member of the set rather than an outlier.

## The two new blocks, as CSS

```css
[data-theme="ixalan"] {
  --bg: #0E1310;
  --surface: #171E19;
  --surface-raised: #1A221C;
  --surface-rail: #121814;
  --surface-sunken: #101512;
  --surface-inset: #141B16;
  --elevated: #212A23;
  --elevated-hover: #18201A;
  --border: #1D2620;
  --border-strong: #2C3830;
  --border-dashed: #3B4A3F;
  --fg: #E0E7DE;
  --fg-body: #B6C2B3;
  --fg-muted: #98A695;
  --fg-faint: #808C7C;
  --fg-locked: #626E5E;
  --accent: #A3C445;
  --accent-hover: #B2D257;
  --accent-strong: #85A22F;
  --accent-shadow: #3E5220;
  --accent-dim: #3E5220;
  --accent-mid: #85A22F;
  --success: #6FA368;
  --warning: #E0913C;
  --danger: #C6533F;
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--accent);
  --avail-hard-fg: #ABCB5B;
  --avail-over-fg: #C56A58;
  --avail-over-border: #752619;
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #98748F;
  --r: #C05A3E;
  --g: #4B7A46;
  --font-display-face: "Trirong", serif;   /* 600 */
}

[data-theme="eldraine"] {
  --bg: #120E17;
  --surface: #1B1821;
  --surface-raised: #1F1C25;
  --surface-rail: #15121B;
  --surface-sunken: #131018;
  --surface-inset: #17141D;
  --elevated: #26232C;
  --elevated-hover: #1D1A23;
  --border: #241D30;
  --border-strong: #342C41;
  --border-dashed: #443C52;
  --fg: #E4DEEE;
  --fg-body: #B9B2C5;
  --fg-muted: #9C95A8;
  --fg-faint: #898395;
  --fg-locked: #6A6475;
  --accent: #AE88E6;
  --accent-hover: #BC9BEE;
  --accent-strong: #8E6AC4;
  --accent-shadow: #4A3568;
  --accent-dim: #4A3568;
  --accent-mid: #8E6AC4;
  --success: #6FA368;
  --warning: #E0913C;
  --danger: #C6533F;
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--accent);
  --avail-hard-fg: #B795EA;
  --avail-over-fg: #C56A58;
  --avail-over-border: #752619;
  --w: #F4E9C4;
  --u: #3A6AA5;
  --b: #98748F;
  --r: #C05A3E;
  --g: #4B7A46;
  --font-display-face: "Cormorant Garamond", serif;   /* 600 — never 400 */
}
```

## Accent contrast — unchanged from R5

| Theme | `--accent` on `--bg` | on `--surface` | `--fg-muted` on `--surface` |
|---|---|---|---|
| Low Sun | 6.4 | 5.9 | 4.6 ✓ |
| Neon Rain | 6.3 | 5.8 | 4.7 ✓ |
| Oil Haze | 4.7 | **4.3 ✗** | 4.6 ✓ |
| First Frost | 5.0 | **4.5 ✗** | 4.6 ✓ |
| **Canopy** | **9.4** | **8.5** | **6.7 ✓** |
| **Witching Hour** | **6.8** | **6.2** | **6.1 ✓** |

Oil Haze and First Frost are the pre-existing failures, carried over untouched.
