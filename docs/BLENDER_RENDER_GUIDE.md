# Blender 렌더 가이드 — KayKit 3D → 2D 스프라이트 (경로 Y)

> 3D 캐릭터(KayKit)를 게임용 2D 스프라이트 시트로 굽는 실행 가이드. **PC 작업**(Blender 필요).
> 두 경로: **A) 자동 스크립트**(권장·빠름) · **B) 수동**(GUI로 감 잡기). MVP는 Knight 1캐릭 4상태.
> 산출물 규격·엔진 배선은 `docs/ART_PIPELINE_3D.md` 참조.

---

## 0. 준비물 (최초 1회)

- **Blender 4.x** — https://www.blender.org/download/ (무료)
- 압축 푼 CC0 팩 2개(이미 보유):
  - `KayKit_Adventurers_2.0_FREE/` (캐릭터 + 무기)
  - `KayKit_Character_Animations_1.1/` (애니 161)
- 저장소 클론(APK 빌드와 같은 폴더): `D:\.CODE\.Claude\방치형 RPG\axdata_01`

---

## A. 자동 스크립트 (권장)

리포에 포함된 `scripts/blender_render_sprites.py`가 캐릭+애니를 로드→측면 정사영 카메라→
상태별 **가로 스트립 PNG**를 자동 출력합니다.

### A-1. 실행 (터미널/CMD)

```cmd
cd "D:\.CODE\.Claude\방치형 RPG\axdata_01"

blender --background --python scripts/blender_render_sprites.py -- ^
  --char  "C:\경로\KayKit_Adventurers_2.0_FREE\Characters\gltf\Knight.glb" ^
  --anims "C:\경로\KayKit_Character_Animations_1.1\Animations\gltf\Rig_Medium" ^
  --out   "assets\units\fantasy\knight" ^
  --name  knight --frame 128
```
> `blender`가 PATH에 없으면 전체 경로로: `"C:\Program Files\Blender Foundation\Blender 4.x\blender.exe"`.
> Windows 줄바꿈은 `^`, macOS/Linux는 `\`.

### A-2. 결과
`assets/units/fantasy/knight/` 에 4장:
`knight_idle.png · knight_attack.png · knight_hit.png · knight_death.png` (가로 스트립·투명배경)

### A-3. 처음 한 번 맞출 값 (스크립트 상단 상수)
모델 방향/크기는 팩마다 달라 **최초 1회만** 조정하면 이후 전 캐릭 공용:
- `FACING_Z_DEG` — 캐릭이 **화면 오른쪽**을 보게(안 맞으면 0/90/180/270 시도).
- `CAM_ORTHO_SCALE` — 프레임에 꽉 차게(잘리면 ↑, 작으면 ↓).
- `STATES` — 마법/궁수 캐릭은 `attack` 클립을 `Ranged_Magic_Spellcasting` / `Ranged_Bow_Release`로.

### A-4. 여러 캐릭 확장
`--char`/`--name`만 바꿔 반복(배치 파일로 묶어도 됨):
```
Knight→knight · Barbarian→barbarian · Mage→mage(마법 attack) · Ranger→ranger(활 attack) · Rogue→rogue
```

> ⚠️ 이 스크립트는 **v1**입니다. KayKit 리그 기준으로 작성했지만 Blender 버전/모델 방향에 따라
> 카메라·회전 미세조정이 필요할 수 있습니다. 첫 렌더가 이상하면 A-3 값을 조정하거나, 아래 B(수동)로
> 감을 잡은 뒤 값을 스크립트에 반영하세요. 막히면 렌더 결과 1장 올려주시면 같이 잡습니다.

---

## B. 수동 (GUI · 감 잡기 / 스크립트 안 될 때)

1. **새 파일** → 기본 큐브 삭제(X).
2. **캐릭 임포트**: File → Import → glTF 2.0 → `Knight.glb`.
3. **애니 임포트**: 같은 방법으로 `Rig_Medium/Rig_Medium_General.glb`(Idle/Hit/Death 포함),
   `..._CombatMelee.glb`(공격) 임포트 → 액션이 로드됨.
4. **액션 연결**: 캐릭 아마추어 선택 → Dope Sheet를 **Action Editor**로 전환 → 드롭다운에서
   `Idle_A` 선택. (같은 리그라 바로 붙음)
5. **카메라**: 넘패드 3(오른쪽 뷰) → 카메라 추가(Add → Camera) → 카메라 속성에서 **Orthographic**,
   `Ctrl+Alt+Numpad0`로 현재 뷰에 카메라 정렬. 캐릭이 오른쪽 보게 필요시 아마추어 Z 90° 회전.
6. **투명 배경**: Render Properties → Film → **Transparent** 체크.
7. **해상도**: Output Properties → 128 × 128, File Format **PNG / RGBA**.
8. **스프라이트 시트**: [Sprite Sheet Maker](https://github.com/ManasMakde/SpriteSheetMaker) 애드온 설치 후
   상태(액션)별로 **가로 스트립** 출력. (애드온 없이 프레임 낱장 렌더 후 합쳐도 됨)
9. 파일명 규칙: `knight_idle.png` 등 → `assets/units/fantasy/knight/`.

---

## C. MVP 체크리스트 (지금 목표)

- [ ] Knight 4상태(idle/attack/hit/death) 렌더 → `knight_*.png`
- [ ] 프레임 128×128 · 투명 · **오른쪽 바라봄** 확인
- [ ] 4장 업로드(합쳐도 수 MB) → 원격에서 `SpriteAnim` 실데이터 검증 + `PixelIdleScreen` 배선
- [ ] play.html에서 idle·공격·피격 확인 → 규격 확정 → 6바디 확장

---

## D. 산출물 규격 (엔진이 기대하는 것)

| 항목 | 값 |
|---|---|
| 시트 | 상태별 **가로 스트립**(1행 N프레임) |
| 프레임 | 128×128 (또는 96×96) · 정사영 · 투명 PNG(RGBA) |
| 방향 | 오른쪽(적은 엔진에서 좌우 반전) |
| 경로/이름 | `assets/units/<concept>/<name>/<name>_<state>.png` |
| 상태 | idle · attack · hit · death (+ 후에 spawn) |

→ 이 규격이면 `app/unitSprites.js`에 `require` 한 줄씩 등록만으로 인게임 자동 반영.
