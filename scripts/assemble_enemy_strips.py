# 적 개별 프레임 → 전투용 가로 스트립 조립(idle/hit/attack), assets/units/enemy 반영
import os
from PIL import Image

SRC16 = r"D:/.CODE/AXdata/axdata_05/out_enemy16"    # idle_a, hit_a
SRCATK = r"D:/.CODE/AXdata/axdata_05/out_enemy_atk"  # 적별 attack 클립
DST = r"D:/.CODE/AXdata/axdata_01/axdata_01/assets/units/enemy"
FRAME = 128
NFR = 16

# id -> (attack 클립 소문자)
ENEMIES = {
    "skeleton_golem":   "melee_2h_attack_chop",
    "skeleton_mage":    "ranged_magic_shoot",
    "skeleton_minion":  "melee_1h_attack_slice_diagonal",
    "skeleton_warrior": "melee_1h_attack_slice_diagonal",
    "werewolf_wolf":    "melee_unarmed_attack_kick",
}

def build(cid, clip, src):
    frames = []
    for i in range(NFR):
        p = os.path.join(src, f"{cid}_{clip}_{i:02d}.png")
        if not os.path.exists(p):
            return None, p
        frames.append(Image.open(p).convert("RGBA").resize((FRAME, FRAME), Image.LANCZOS))
    strip = Image.new("RGBA", (FRAME*NFR, FRAME), (0, 0, 0, 0))
    for i, im in enumerate(frames):
        strip.paste(im, (i*FRAME, 0))
    return strip, None

missing, made = [], 0
for cid, atk in ENEMIES.items():
    outdir = os.path.join(DST, cid)
    os.makedirs(outdir, exist_ok=True)
    for state, clip, src in (("idle", "idle_a", SRC16), ("hit", "hit_a", SRC16), ("attack", atk, SRCATK)):
        strip, miss = build(cid, clip, src)
        if strip is None:
            missing.append((cid, state, miss)); continue
        strip.save(os.path.join(outdir, f"{cid}_{state}.png"))
        made += 1

print(f"생성 스트립: {made}개 (기대 {len(ENEMIES)*3})")
if missing:
    print("누락:")
    for cid, st, p in missing:
        print("  ", cid, st, "->", os.path.basename(p))
else:
    print("누락 없음")
