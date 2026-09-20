/**
 * input.js — 무엇으로 조작하고 있는가
 *
 * 같은 게임을 마우스로도 손가락으로도 한다. 둘은 할 수 있는 일이 다르다.
 *   마우스  오른쪽 단추가 있다. 커서가 화면 가장자리에 닿을 수 있다.
 *   손가락  단추가 하나뿐이다. 대신 두 개가 있고, 길게 누를 수 있다.
 *
 * 그래서 "지금 무엇으로 조작하는가"를 한 군데에 적어 두고,
 * 조작(control) · 조작판(hud) · 안내(tutorial) 가 함께 본다.
 * 값은 마지막으로 쓴 입력에 따라 바뀐다 (태블릿에서 손가락과 마우스를 번갈아 써도 된다).
 */
export const INPUT = {
    /** 지금 손가락으로 하고 있는가 */
    touch: matchMedia("(pointer: coarse)").matches,

    /** 화면이 좁은가 (조작판을 줄여야 하는가) */
    get small() {
        return window.innerWidth < 820 || window.innerHeight < 520;
    }
};

/** 손가락은 마우스보다 굵다. 집는 반경도 그만큼 넓혀야 한다. */
export function pickRadius() {
    return INPUT.touch ? 40 : 26;
}

/** 안내 문구를 입력에 맞게 고른다 */
export function byInput(mouseText, touchText) {
    return INPUT.touch ? touchText : mouseText;
}
