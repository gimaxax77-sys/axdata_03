# 개별 프레임(out_roster_full) → 전투용 가로 스트립 조립(idle/attack/hit)
import os, sys
from PIL import Image

SRC = r"D:/.CODE/AXdata/axdata_05/out_battle16"
DST = r"D:/.CODE/AXdata/axdata_01/axdata_01/assets/units/fantasy"
FRAME = 128          # 출력 프레임 크기(정사각)
NFR = 16             # 프레임 수(00~15) — 부드러운 애니

# 원형별 공격 클립
ATTACK = {
    "VANGUARD": "melee_1h_attack_slice_diagonal",
    "STRIKER":  "melee_2h_attack_chop",
    "ROGUE":    "melee_1h_attack_stab",
    "ARCHER":   "ranged_bow_release",
    "MAGE":     "ranged_magic_shoot",
    "SUPPORT":  "ranged_magic_spellcasting",
}

# id -> archetype (roster)
ROSTER = [
    ("knight","VANGUARD"),("paladin","VANGUARD"),("paladin_with_helmet","VANGUARD"),("skeleton_golem","VANGUARD"),
    ("barbarian","STRIKER"),("barbarian_large","STRIKER"),("werewolf_man","STRIKER"),("werewolf_wolf","STRIKER"),
    ("skeleton_warrior","STRIKER"),("skeleton_minion","STRIKER"),
    ("druid","SUPPORT"),("animatronic_normal","SUPPORT"),
    ("rogue","ROGUE"),("rogue_hooded","ROGUE"),("skeleton_rogue","ROGUE"),("animatronic_creepy","ROGUE"),
    ("ranger","ARCHER"),("engineer","ARCHER"),
    ("mage","MAGE"),("necromancer","MAGE"),("skeleton_mage","MAGE"),
]

def clip_for(cid, state, arch):
    if state == "idle":   return "idle_a"
    if state == "hit":    return "hit_a"
    if state == "walk":   return "walking_a"
    if state == "attack": return ATTACK[arch]
    raise ValueError(state)

def build_strip(cid, clip):
    frames = []
    for i in range(NFR):
        p = os.path.join(SRC, f"{cid}_{clip}_{i:02d}.png")
        if not os.path.exists(p):
            return None, p
        im = Image.open(p).convert("RGBA").resize((FRAME, FRAME), Image.LANCZOS)
        frames.append(im)
    strip = Image.new("RGBA", (FRAME*NFR, FRAME), (0,0,0,0))
    for i, im in enumerate(frames):
        strip.paste(im, (i*FRAME, 0))
    return strip, None

missing = []
made = 0
for cid, arch in ROSTER:
    outdir = os.path.join(DST, cid)
    os.makedirs(outdir, exist_ok=True)
    for state in ("idle","attack","hit","walk"):
        clip = clip_for(cid, state, arch)
        strip, miss = build_strip(cid, clip)
        if strip is None:
            missing.append((cid, state, miss)); continue
        strip.save(os.path.join(outdir, f"{cid}_{state}.png"))
        made += 1

print(f"생성 스트립: {made}개 (기대 {len(ROSTER)*3})")
if missing:
    print("누락:")
    for cid, st, p in missing:
        print("  ", cid, st, "->", os.path.basename(p))
else:
    print("누락 없음")
