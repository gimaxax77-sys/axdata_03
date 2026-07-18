"""
blender_render_sprites.py — KayKit 3D 캐릭터를 게임용 2D 스프라이트 시트로 렌더.

경로 Y(3D→2D 프리렌더) 자동화. Blender 4.x에서 백그라운드로 실행한다.
  blender --background --python scripts/blender_render_sprites.py -- \
      --char  "KayKit_Adventurers/Characters/gltf/Knight.glb" \
      --anims "KayKit_Character_Animations/Animations/gltf/Rig_Medium" \
      --out   "assets/units/fantasy/knight" \
      --name  knight --frame 128

출력: <out>/<name>_<state>.png  (가로 스트립, 투명 배경, 오른쪽 바라봄)
  상태: idle · attack · hit · death (MVP 4종). CHAR/STATES 수정해 확장.

⚠️ v1 스캐폴드: KayKit 리그 기준으로 작성. 캐릭터가 바라보는 방향/스케일은
   모델마다 다를 수 있어 CAMERA_* / FACING 값을 한 번 맞춰두면 이후 전 캐릭 공용.
"""
import bpy, sys, os, argparse, math
import numpy as np

# ── 상태 → 애니 클립 이름(KayKit) · 재생 규약 ──────────────────
STATES = {
    "idle":   {"clip": "Idle_A",                        "loop": True},
    "attack": {"clip": "Melee_1H_Attack_Slice_Diagonal","loop": False},
    "hit":    {"clip": "Hit_A",                          "loop": False},
    "death":  {"clip": "Death_A",                        "loop": False},
}
# 마법/원거리 캐릭이면 attack 클립을 Ranged_Magic_Spellcasting / Ranged_Bow_Release 로.

# ── 카메라/조명(맞춰두면 전 캐릭 공용) ───────────────────────────
FACING_Z_DEG = 90     # 캐릭이 화면 오른쪽을 보게 회전(모델이 안 맞으면 0/90/180/270 조정)
CAM_ORTHO_SCALE = 2.6 # 프레임에 캐릭이 꽉 차게(작으면 줄이고 잘리면 키움)
CAM_HEIGHT = 1.0      # 캐릭 허리 높이쯤


def argv_after_ddash():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--char", required=True)
    p.add_argument("--anims", required=True, help="애니 glb들이 있는 폴더")
    p.add_argument("--out", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--frame", type=int, default=128)
    return p.parse_args(argv_after_ddash())


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def find_armature(objs):
    for o in objs:
        if o.type == "ARMATURE":
            return o
    return None


def load_all_actions(anims_dir):
    """애니 폴더의 모든 glb를 임포트해 액션(클립)을 bpy.data.actions에 적재."""
    for f in sorted(os.listdir(anims_dir)):
        if f.lower().endswith((".glb", ".gltf")):
            import_glb(os.path.join(anims_dir, f))


def find_action(clip_name):
    # glTF는 이름에 접두어가 붙기도 함 → 부분일치 허용.
    for a in bpy.data.actions:
        if a.name == clip_name:
            return a
    for a in bpy.data.actions:
        if clip_name.lower() in a.name.lower():
            return a
    return None


def setup_camera_light(frame_px):
    # 정사영 측면 카메라(오른쪽 뷰). 캐릭이 +? 를 보도록 FACING로 맞춤.
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = CAM_ORTHO_SCALE
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    # 캐릭 측면을 보도록 X축 상에 배치(오른쪽 뷰: -X에서 +X를 바라봄)
    cam.location = (-6.0, 0.0, CAM_HEIGHT)
    cam.rotation_euler = (math.radians(90), 0.0, math.radians(-90))
    bpy.context.scene.camera = cam

    sun_data = bpy.data.lights.new("Sun", type="SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("Sun", sun_data)
    sun.rotation_euler = (math.radians(55), math.radians(20), math.radians(30))
    bpy.context.collection.objects.link(sun)

    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE" if hasattr(sc.render, "engine") else sc.render.engine
    sc.render.film_transparent = True          # 투명 배경
    sc.render.resolution_x = frame_px
    sc.render.resolution_y = frame_px
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"


def render_state(armature, action, out_dir, name, state, frame_px):
    armature.animation_data_create()
    armature.animation_data.action = action
    fs, fe = int(action.frame_range[0]), int(action.frame_range[1])
    sc = bpy.context.scene
    tmp = os.path.join(out_dir, "_tmp_%s" % state)
    os.makedirs(tmp, exist_ok=True)
    frames = []
    for i, fr in enumerate(range(fs, fe + 1)):
        sc.frame_set(fr)
        fp = os.path.join(tmp, "f_%03d.png" % i)
        sc.render.filepath = fp
        bpy.ops.render.render(write_still=True)
        frames.append(fp)
    combine_strip(frames, os.path.join(out_dir, "%s_%s.png" % (name, state)), frame_px)
    for fp in frames:
        os.remove(fp)
    os.rmdir(tmp)
    return len(frames)


def combine_strip(frame_paths, out_path, frame_px):
    """프레임 PNG들을 가로 스트립 1장으로 합침(numpy)."""
    cols = []
    for fp in frame_paths:
        img = bpy.data.images.load(fp)
        w, h = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
        px = np.flipud(px)  # Blender 픽셀은 아래→위 → 뒤집기
        cols.append(px)
        bpy.data.images.remove(img)
    strip = np.concatenate(cols, axis=1)  # 가로 결합
    h, w, _ = strip.shape
    out = bpy.data.images.new("strip", width=w, height=h, alpha=True)
    out.pixels = np.flipud(strip).reshape(-1).tolist()
    out.filepath_raw = out_path
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)


def main():
    args = parse_args()
    os.makedirs(args.out, exist_ok=True)
    clean_scene()

    char_objs = import_glb(args.char)
    arm = find_armature(char_objs)
    if not arm:
        print("‼ 아마추어(리그)를 못 찾음:", args.char); return
    if FACING_Z_DEG:
        arm.rotation_euler = (arm.rotation_euler.x, arm.rotation_euler.y,
                              arm.rotation_euler.z + math.radians(FACING_Z_DEG))

    load_all_actions(args.anims)
    setup_camera_light(args.frame)

    for state, meta in STATES.items():
        act = find_action(meta["clip"])
        if not act:
            print("⚠ 클립 없음(건너뜀):", state, meta["clip"]); continue
        n = render_state(arm, act, args.out, args.name, state, args.frame)
        print("✓ %s_%s.png  (%d프레임)" % (args.name, state, n))

    print("완료 →", args.out)


if __name__ == "__main__":
    main()
