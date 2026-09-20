/**
 * palette.js — 시대별 질감 팔레트와 텍스처 굽기
 *
 * 탐험 모드와 RTS 모드가 함께 쓴다. 시대의 "색과 결"은 한 곳에만 둔다.
 */
import { seedRandom } from "./rng.js";
import { G } from "./state.js";
import {
    makeMistTexture, makeStoneTexture, makeTerrainTexture,
    makeThatchTexture, makeWaterTexture, makeWoodTexture
} from "./textures.js";
import { cssHex, cssRGBA } from "./world.js";

/**
 * 시대별 텍스처 팔레트.
 * 여기 색만 바꾸면 그 시대의 땅/돌/지붕 질감이 통째로 바뀐다.
 */
export const TEX_PALETTE = [
    // 신석기: 강가의 마른 흙, 마른 갈대
    {
        dirtBase: 0x6f8442,
        dirtSpots: [0x8aa052, 0x56682f, 0xa8894e, 0x7d9147, 0xc0a663],
        stoneBase: 0x726e68,
        stoneSpots: [0x8a9287, 0x54584f, 0x5b724e], // 초록 이끼 낀 돌 포인트
        thatch: [0xb08a4c, 0x6b4f26, 0xd8b877],
        wood: [0x6d4a26, 0x33210f],
        water: [0x367a88, 0xcae5e8],
        cloth: [0x6a5a44, 0x2f2718]
    },
    // 청동기: 붉은 황토
    {
        dirtBase: 0x6d7d3c,
        dirtSpots: [0x879349, 0x55632d, 0xa87f45, 0x76884a, 0xbb9a58],
        stoneBase: 0x6f665d,
        stoneSpots: [0x8e8378, 0x4f4941, 0x5c7250],
        thatch: [0xa87f45, 0x63481f, 0xd0ac6a],
        wood: [0x66421f, 0x2d1c0c],
        water: [0x386d75, 0xc8dede],
        cloth: [0x6b4f33, 0x2b1d10]
    },
    // 삼국: 다져 올린 흙과 기와
    {
        dirtBase: 0x63793a,
        dirtSpots: [0x7f9448, 0x4c5f2c, 0x9c7e4e, 0x6d8442, 0xb09a5c],
        stoneBase: 0x736c63,
        stoneSpots: [0x8f887c, 0x524c45, 0x5e7552],
        thatch: [0xa88a4e, 0x63481f, 0xd0ac6a],
        wood: [0x66421f, 0x2d1c0c],
        water: [0x356872, 0xc5deda],
        cloth: [0x6b5236, 0x2b1d10]
    },
    // 조선: 밤의 흙길
    {
        dirtBase: 0x5f7038,
        dirtSpots: [0x7b8c44, 0x49572a, 0x8d7a52, 0x697c3e, 0xa6924f],
        stoneBase: 0x545059,
        stoneSpots: [0x6b6772, 0x3a373f, 0x4a5246],
        thatch: [0x8b7449, 0x4d3c22, 0xb09566],
        wood: [0x4d3620, 0x221609],
        water: [0x38414f, 0x9fb0bd],
        cloth: [0x4f4a52, 0x24202a]
    },
    // 1970: 마른 흙과 시멘트
    {
        dirtBase: 0x6f7c45,
        dirtSpots: [0x8a9550, 0x545f33, 0x9b8557, 0x77854a, 0xb09963],
        stoneBase: 0x8e8980,
        stoneSpots: [0xa8a49a, 0x6f6a62, 0x7a8470],
        thatch: [0xa88a4e, 0x63481f, 0xd0ac6a],
        wood: [0x66421f, 0x2d1c0c],
        water: [0x50666d, 0xcfdcd2],
        cloth: [0x6f6a5c, 0x2f2b24]
    },
    // 2000: 아스팔트와 콘크리트
    {
        dirtBase: 0x6f6a60,
        dirtSpots: [0x817b70, 0x57524a, 0x76705f, 0x8a8478, 0x615c54],
        stoneBase: 0x9a958c,
        stoneSpots: [0xb0aba2, 0x76716a, 0x86907c],
        thatch: [0x9a8a62, 0x5c4f30, 0xc2ad7e],
        wood: [0x5c4630, 0x2b2118],
        water: [0x46606c, 0xcfdcd2],
        cloth: [0x6a6a70, 0x2b2b30]
    }
];

/** 현재 시대의 절차적 텍스처를 모두 새로 굽는다. */
export function buildTextures(index) {
    const p = TEX_PALETTE[index];

    // 텍스처 생성에도 같은 시드를 써서 매번 같은 결과가 나오게 한다
    seedRandom(7000 + index * 911);

    // 오브젝트용 텍스처는 "거의 흰 바탕 + 어두운 결" 이어야 한다.
    // 재질의 color 와 곱해지므로, 텍스처까지 색을 가지면 두 번 어두워진다.
    const GRUNGE = "#e2ddd4";
    const GRUNGE_DARK = "rgba(40,30,20,ALPHA)";
    const GRUNGE_LIGHT = "rgba(255,250,240,ALPHA)";

    G.TEX = {
        // 지면용: 실제 흙 색을 가진 유일한 텍스처 (재질 color 는 흰색)
        dirt: makeTerrainTexture(
            p.dirtSpots.map(cssRGBA),
            cssHex(p.dirtBase),
            { repeat: 26, grit: 38, washes: 150 }
        ),
        // 오브젝트용 흙: 색 없이 질감만
        dirtObj: makeTerrainTexture(
            [GRUNGE_DARK, GRUNGE_LIGHT, "rgba(90,70,50,ALPHA)"],
            GRUNGE,
            { repeat: 2, grit: 22, washes: 70 }
        ),
        stone: makeStoneTexture(GRUNGE, [GRUNGE_DARK, GRUNGE_LIGHT, "rgba(70,80,55,ALPHA)"]),
        thatch: makeThatchTexture("#ded3bd", GRUNGE_DARK, GRUNGE_LIGHT),
        wood: makeWoodTexture("#dcd2c2", GRUNGE_DARK),
        water: makeWaterTexture("#cfd6d4", GRUNGE_LIGHT),
        cloth: makeWoodTexture("#dcd6cc", GRUNGE_DARK),
        // 도로 포장 (근현대 시대에서만 쓴다)
        asphalt: makeStoneTexture("#d6d2ca", [GRUNGE_DARK, "rgba(60,58,54,ALPHA)", GRUNGE_LIGHT]),
        mist: makeMistTexture()
    };
}

